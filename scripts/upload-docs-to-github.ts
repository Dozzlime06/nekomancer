import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const REPO_NAME = 'nekomancer-docs';
const REPO_DESCRIPTION = 'Official documentation for Nekomancer - On-chain prediction markets on Monad';
const DOCS_DIR = 'docs-gitbook';

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(baseDir, fullPath);
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('📚 Nekomancer Docs GitHub Upload');
  console.log('=================================\n');
  
  try {
    const octokit = await getUncachableGitHubClient();
    
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login}\n`);
    
    let repo;
    let isEmptyRepo = false;
    
    try {
      const { data: existingRepo } = await octokit.repos.get({
        owner: user.login,
        repo: REPO_NAME
      });
      repo = existingRepo;
      
      try {
        await octokit.git.getRef({
          owner: user.login,
          repo: REPO_NAME,
          ref: `heads/${existingRepo.default_branch || 'main'}`
        });
        console.log(`📁 Repository "${REPO_NAME}" exists with commits\n`);
      } catch (e: any) {
        if (e.status === 409) {
          console.log(`📁 Repository "${REPO_NAME}" is empty, will initialize...\n`);
          isEmptyRepo = true;
        }
      }
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`📁 Creating repository: ${REPO_NAME}...`);
        const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
          name: REPO_NAME,
          description: REPO_DESCRIPTION,
          private: false,
          auto_init: true
        });
        repo = newRepo;
        console.log(`✅ Repository created: ${newRepo.html_url}`);
        console.log('⏳ Waiting for initialization...\n');
        await sleep(5000);
      } else {
        throw error;
      }
    }
    
    if (isEmptyRepo) {
      console.log('📝 Creating initial commit...');
      await octokit.repos.createOrUpdateFileContents({
        owner: user.login,
        repo: REPO_NAME,
        path: 'README.md',
        message: 'Initial commit',
        content: Buffer.from('# Nekomancer Documentation\n\nOfficial docs for Nekomancer prediction markets.').toString('base64')
      });
      console.log('✅ Initial commit created\n');
      await sleep(2000);
      
      const { data: updatedRepo } = await octokit.repos.get({
        owner: user.login,
        repo: REPO_NAME
      });
      repo = updatedRepo;
    }
    
    console.log('📦 Collecting docs files...');
    const files = getAllFiles(DOCS_DIR);
    console.log(`Found ${files.length} files\n`);
    
    const defaultBranch = repo.default_branch || 'main';
    
    const { data: refData } = await octokit.git.getRef({
      owner: user.login,
      repo: REPO_NAME,
      ref: `heads/${defaultBranch}`
    });
    const latestCommitSha = refData.object.sha;
    
    const { data: commitData } = await octokit.git.getCommit({
      owner: user.login,
      repo: REPO_NAME,
      commit_sha: latestCommitSha
    });
    const baseTreeSha = commitData.tree.sha;
    
    console.log(`📌 Base commit: ${latestCommitSha.substring(0, 7)}\n`);
    
    console.log('🚀 Creating blobs for files...');
    const treeItems: any[] = [];
    let uploadedCount = 0;
    
    for (const file of files) {
      try {
        const fullPath = path.join(DOCS_DIR, file);
        const content = fs.readFileSync(fullPath);
        
        const { data: blob } = await octokit.git.createBlob({
          owner: user.login,
          repo: REPO_NAME,
          content: content.toString('base64'),
          encoding: 'base64'
        });
        
        treeItems.push({
          path: file,
          mode: '100644',
          type: 'blob',
          sha: blob.sha
        });
        
        uploadedCount++;
        if (uploadedCount % 10 === 0) {
          console.log(`  Uploaded ${uploadedCount}/${files.length} files...`);
        }
      } catch (err: any) {
        console.error(`\n❌ Error processing ${file}: ${err.message}`);
      }
    }
    console.log(`✅ Uploaded ${uploadedCount} files\n`);
    
    console.log('🌳 Creating tree...');
    const { data: tree } = await octokit.git.createTree({
      owner: user.login,
      repo: REPO_NAME,
      tree: treeItems,
      base_tree: baseTreeSha
    });
    
    console.log('💾 Creating commit...');
    const { data: commit } = await octokit.git.createCommit({
      owner: user.login,
      repo: REPO_NAME,
      message: 'docs: Nekomancer GitBook Documentation\n\n- Getting started guides\n- Market mechanics\n- Oracle resolution system\n- Technical reference\n- $NEKO tokenomics\n- Security information',
      tree: tree.sha,
      parents: [latestCommitSha]
    });
    
    console.log('🔗 Updating branch reference...');
    await octokit.git.updateRef({
      owner: user.login,
      repo: REPO_NAME,
      ref: `heads/${defaultBranch}`,
      sha: commit.sha
    });
    
    console.log('\n✅ Successfully uploaded docs to GitHub!');
    console.log(`🔗 Repository: ${repo.html_url}`);
    console.log(`📝 Commit: ${commit.sha.substring(0, 7)}`);
    console.log(`\n📖 Connect to GitBook: https://gitbook.com → Import from GitHub → ${user.login}/${REPO_NAME}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

main();
