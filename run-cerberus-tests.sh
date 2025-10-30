#!/bin/bash

# Cerberus Quick Test Runner
# ==========================
# Script ini membantu Anda menjalankan testing Cerberus dengan mudah

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}   🐺 CERBERUS QUICK TEST RUNNER${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}💡 Create .env file with your configuration${NC}"
    exit 1
fi
echo -e "${GREEN}✅ .env file found${NC}"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install ethers dotenv node-fetch@2
fi

echo ""
echo -e "${BLUE}What would you like to do?${NC}"
echo ""
echo -e "  ${GREEN}1)${NC} Run System Status Check"
echo -e "  ${GREEN}2)${NC} Run Real Transaction Tests"
echo -e "  ${GREEN}3)${NC} Start Real-Time Alert Monitor"
echo -e "  ${GREEN}4)${NC} Run Full Test Suite (All of the above)"
echo -e "  ${GREEN}5)${NC} Quick Start Guide"
echo -e "  ${RED}6)${NC} Exit"
echo ""
read -p "$(echo -e ${CYAN}Enter your choice [1-6]: ${NC})" choice

case $choice in
    1)
        echo ""
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
        echo -e "${MAGENTA}   RUNNING SYSTEM STATUS CHECK${NC}"
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
        echo ""
        node check-system-status.js
        ;;
    
    2)
        echo ""
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
        echo -e "${MAGENTA}   RUNNING REAL TRANSACTION TESTS${NC}"
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT REMINDERS:${NC}"
        echo -e "${YELLOW}   1. Make sure AI Sentinel is running (services/ai-sentinel)${NC}"
        echo -e "${YELLOW}   2. Make sure Monitor is running (services/mempool-monitor)${NC}"
        echo -e "${YELLOW}   3. Make sure you have enough U2U testnet tokens${NC}"
        echo ""
        read -p "$(echo -e ${CYAN}Press Enter to continue or Ctrl+C to cancel...${NC})"
        echo ""
        node test-real-transactions.js
        ;;
    
    3)
        echo ""
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
        echo -e "${MAGENTA}   STARTING REAL-TIME ALERT MONITOR${NC}"
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${CYAN}📡 Starting monitor... Press Ctrl+C to stop${NC}"
        echo ""
        node monitor-alerts-realtime.js
        ;;
    
    4)
        echo ""
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
        echo -e "${MAGENTA}   RUNNING FULL TEST SUITE${NC}"
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
        echo ""
        
        # Step 1: Status Check
        echo -e "${BLUE}Step 1/3: System Status Check${NC}"
        node check-system-status.js
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ System check failed. Please fix errors before continuing.${NC}"
            exit 1
        fi
        
        echo ""
        read -p "$(echo -e ${CYAN}Continue to transaction tests? [Y/n]: ${NC})" continue_tests
        if [[ $continue_tests =~ ^[Nn]$ ]]; then
            echo -e "${YELLOW}Tests cancelled.${NC}"
            exit 0
        fi
        
        # Step 2: Transaction Tests
        echo ""
        echo -e "${BLUE}Step 2/3: Real Transaction Tests${NC}"
        echo -e "${YELLOW}⚠️  Make sure Monitor and AI Sentinel are running!${NC}"
        read -p "$(echo -e ${CYAN}Press Enter when ready...${NC})"
        node test-real-transactions.js
        
        # Step 3: Monitor
        echo ""
        echo -e "${BLUE}Step 3/3: Start Real-Time Monitor${NC}"
        read -p "$(echo -e ${CYAN}Start alert monitor? [Y/n]: ${NC})" start_monitor
        if [[ ! $start_monitor =~ ^[Nn]$ ]]; then
            node monitor-alerts-realtime.js
        fi
        ;;
    
    5)
        echo ""
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
        echo -e "${MAGENTA}   QUICK START GUIDE${NC}"
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${CYAN}🚀 Quick Start Steps:${NC}"
        echo ""
        echo -e "${BLUE}1. Start AI Sentinel API${NC}"
        echo -e "   ${YELLOW}cd services/ai-sentinel${NC}"
        echo -e "   ${YELLOW}source venv/bin/activate${NC}  ${GREEN}# Windows: .\\venv\\Scripts\\Activate.ps1${NC}"
        echo -e "   ${YELLOW}python app.py${NC}"
        echo ""
        echo -e "${BLUE}2. Start Mempool Monitor (new terminal)${NC}"
        echo -e "   ${YELLOW}cd services/mempool-monitor${NC}"
        echo -e "   ${YELLOW}node index.js${NC}"
        echo ""
        echo -e "${BLUE}3. Start Frontend (new terminal, optional)${NC}"
        echo -e "   ${YELLOW}cd apps/frontend${NC}"
        echo -e "   ${YELLOW}npm run dev${NC}"
        echo ""
        echo -e "${BLUE}4. Run Tests (new terminal)${NC}"
        echo -e "   ${YELLOW}./run-cerberus-tests.sh${NC}"
        echo -e "   ${GREEN}→ Choose option 1 first (Status Check)${NC}"
        echo -e "   ${GREEN}→ Then option 2 (Run Tests)${NC}"
        echo -e "   ${GREEN}→ Finally option 3 (Monitor Alerts)${NC}"
        echo ""
        echo -e "${CYAN}📖 For detailed guide, read: TESTING-GUIDE.md${NC}"
        echo ""
        ;;
    
    6)
        echo ""
        echo -e "${CYAN}👋 Goodbye!${NC}"
        exit 0
        ;;
    
    *)
        echo ""
        echo -e "${RED}❌ Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Done!${NC}"
echo ""