# Cerberus Split Deployment Script
# Moves AI Sentinel from Vercel to Railway

$ESC = [char]27
$Green = "$ESC[92m"
$Yellow = "$ESC[93m"
$Blue = "$ESC[94m"
$Magenta = "$ESC[95m"
$Reset = "$ESC[0m"

function Write-Success { param([string]$Message); Write-Host "${Green}✅ $Message${Reset}" }
function Write-Warning { param([string]$Message); Write-Host "${Yellow}⚠️  $Message${Reset}" }
function Write-Info { param([string]$Message); Write-Host "${Blue}ℹ️  $Message${Reset}" }

Write-Host "${Magenta}"
Write-Host @"
   ____          _                     
  / ___|___ _ __| |__   ___ _ __ _   _ 
 | |   / _ \ '__| '_ \ / _ \ '__| | | |
 | |__|  __/ |  | |_) |  __/ |  | |_| |
  \____\___|_|  |_.__/ \___|_|   \__,_|
                                        
  🚂 Split Deployment Setup
  
"@
Write-Host "${Reset}"

if (-not (Test-Path "vercel.json")) {
    Write-Host "${Red}❌ vercel.json not found!${Reset}"
    Write-Info "Run from: C:\Users\ASUS\cerberus-watchdog"
    Read-Host "`nPress Enter to exit"
    exit 1
}

Write-Info "Setting up split deployment (Vercel + Railway)...`n"

# Step 1: Update vercel.json (remove AI Sentinel)
Write-Info "Step 1: Updating vercel.json (removing AI Sentinel)..."

$newVercelConfig = @"
{
  "version": 2,
  "builds": [
    {
      "src": "services/mempool-monitor/advanced_monitor.js",
      "use": "@vercel/node"
    },
    {
      "src": "apps/frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/monitor",
      "dest": "/services/mempool-monitor/advanced_monitor.js"
    },
    {
      "src": "/(.*)",
      "dest": "/apps/frontend/`$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_CONTRACT_ADDRESS": "0xC65f3ec1e0a6853d2e6267CB918E683BA7E4f36c",
    "NEXT_PUBLIC_U2U_RPC_HTTP": "https://rpc-nebulas-testnet.uniultra.xyz"
  },
  "regions": ["sin1"]
}
"@

Copy-Item "vercel.json" "vercel.json.backup"
$newVercelConfig | Out-File -FilePath "vercel.json" -Encoding ASCII
Write-Success "vercel.json updated (AI Sentinel removed)"
Write-Info "Backup saved: vercel.json.backup"

# Step 2: Create Railway config files
Write-Info "`nStep 2: Creating Railway configuration files..."

# Procfile
"web: python advanced_ai_sentinel.py" | Out-File -FilePath "services\ai-sentinel\Procfile" -Encoding ASCII -NoNewline
Write-Success "Created Procfile"

# .python-version
"3.11" | Out-File -FilePath "services\ai-sentinel\.python-version" -Encoding ASCII -NoNewline
Write-Success "Created .python-version"

# railway.json
$railwayConfig = @"
{
  "`$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "python advanced_ai_sentinel.py",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
"@

$railwayConfig | Out-File -FilePath "services\ai-sentinel\railway.json" -Encoding ASCII
Write-Success "Created railway.json"

# Step 3: Show summary
Write-Host "`n${Yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${Reset}"
Write-Host "${Yellow}Files Created/Modified:${Reset}"
Write-Host "${Yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${Reset}`n"

Write-Success "Updated: vercel.json (Frontend + Monitor only)"
Write-Success "Created: services\ai-sentinel\Procfile"
Write-Success "Created: services\ai-sentinel\.python-version"
Write-Success "Created: services\ai-sentinel\railway.json"

# Step 4: Git status
Write-Host "`n${Blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${Reset}"
Write-Host "${Blue}Git Status:${Reset}"
Write-Host "${Blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${Reset}`n"

git status --short

# Step 5: Commit option
Write-Host ""
$shouldCommit = Read-Host "Commit these changes? (y/n)"

if ($shouldCommit -eq "y" -or $shouldCommit -eq "Y") {
    Write-Info "Committing changes..."
    
    git add vercel.json services\ai-sentinel\Procfile services\ai-sentinel\.python-version services\ai-sentinel\railway.json
    git commit -m "Split deployment: Move AI Sentinel to Railway

- Remove AI Sentinel from Vercel (size limit issue)
- Add Railway configuration files
- Keep Frontend + Monitor on Vercel"
    
    Write-Success "Changes committed"
    
    $shouldPush = Read-Host "`nPush to remote? (y/n)"
    
    if ($shouldPush -eq "y" -or $shouldPush -eq "Y") {
        git push
        Write-Success "Pushed to remote"
    }
}

# Final instructions
Write-Host "`n${Green}╔════════════════════════════════════════════════════════╗${Reset}"
Write-Host "${Green}║         🎉  SETUP COMPLETE!  🎉                        ║${Reset}"
Write-Host "${Green}╚════════════════════════════════════════════════════════╝${Reset}`n"

Write-Host "${Yellow}Next Steps:${Reset}`n"

Write-Host "1️⃣  Deploy Frontend + Monitor to Vercel:"
Write-Host "   ${Blue}vercel --prod${Reset}`n"

Write-Host "2️⃣  Deploy AI Sentinel to Railway:"
Write-Host "   ${Blue}a) Visit: https://railway.app${Reset}"
Write-Host "   ${Blue}b) Sign up with GitHub${Reset}"
Write-Host "   ${Blue}c) New Project → Deploy from GitHub${Reset}"
Write-Host "   ${Blue}d) Select: laudzakusuma/CERBERUS${Reset}"
Write-Host "   ${Blue}e) Root Directory: services/ai-sentinel${Reset}"
Write-Host "   ${Blue}f) Deploy!${Reset}`n"

Write-Host "3️⃣  After Railway deploys, get the URL (e.g., https://your-app.railway.app)"

Write-Host "`n4️⃣  Update Frontend environment variable:"
Write-Host "   ${Blue}Vercel Dashboard → Project → Settings → Environment Variables${Reset}"
Write-Host "   ${Blue}Add: NEXT_PUBLIC_AI_API_URL=https://your-app.railway.app${Reset}"

Write-Host "`n5️⃣  Redeploy Vercel to apply env var:"
Write-Host "   ${Blue}vercel --prod${Reset}"

Write-Host "`n${Green}Your Cerberus will now run on 2 platforms!${Reset}"
Write-Host "${Green}• Vercel: Frontend + Monitor${Reset}"
Write-Host "${Green}• Railway: AI Sentinel (ML workloads)${Reset}`n"

Read-Host "Press Enter to exit"