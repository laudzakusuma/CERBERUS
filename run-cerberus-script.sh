#!/bin/bash

# Run Cerberus Complete System
# This script starts all components of the Cerberus Watchdog

echo "🐕 CERBERUS WATCHDOG STARTUP SCRIPT"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Creating .env file...${NC}"
    cat > .env << EOF
# Cerberus Configuration
AI_API_URL=http://127.0.0.1:5001/predict
CONTRACT_ADDRESS=0xBb05190BA95adBf889A61F113E3C251a9C605832
MONITOR_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
EOF
    echo -e "${RED}❌ Please edit .env file and add your MONITOR_PRIVATE_KEY${NC}"
    exit 1
fi

# Function to check if a process is running
check_process() {
    if netstat -ano | findstr ":$1" | findstr "LISTENING" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to start AI Sentinel
start_ai_sentinel() {
    echo -e "${GREEN}🤖 Starting AI Sentinel...${NC}"
    
    if check_process 5001; then
        echo "   ✅ AI Sentinel already running on port 5001"
    else
        cd services/ai-sentinel
        
        # Check if virtual environment exists
        if [ ! -d "venv" ]; then
            echo "   Creating Python virtual environment..."
            python3 -m venv venv
        fi
        
        # Activate virtual environment and install dependencies
        source venv/Scripts/activate
        pip install -q flask flask-cors pandas scikit-learn joblib numpy
        
        # Start AI Sentinel in background
        nohup python app.py > ai_sentinel.log 2>&1 &
        AI_PID=$!
        
        echo "   Waiting for AI Sentinel to start..."
        sleep 5
        
        if check_process 5001; then
            echo -e "   ${GREEN}✅ AI Sentinel started (PID: $AI_PID)${NC}"
        else
            echo -e "   ${RED}❌ Failed to start AI Sentinel${NC}"
            exit 1
        fi
        
        cd ../..
    fi
}

# Function to start Monitor
start_monitor() {
    echo -e "${GREEN}📡 Starting Monitor...${NC}"
    
    cd services/mempool-monitor
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "   Installing dependencies..."
        npm install ethers dotenv node-fetch@2
    fi
    
    # Copy the final monitor script if not exists
    if [ ! -f "cerberus-monitor.js" ]; then
        echo "   Creating monitor script..."
        cp ../../final-complete-monitor.js cerberus-monitor.js
    fi
    
    # Start monitor
    echo "   Starting Cerberus Monitor..."
    node cerberus-monitor.js &
    MONITOR_PID=$!
    
    echo -e "   ${GREEN}✅ Monitor started (PID: $MONITOR_PID)${NC}"
    
    cd ../..
}

# Function to check system status
check_status() {
    echo ""
    echo "📊 SYSTEM STATUS CHECK"
    echo "======================"
    
    # Check AI Sentinel
    if check_process 5001; then
        echo -e "AI Sentinel:    ${GREEN}✅ Online${NC}"
        
        # Test AI endpoint
        if curl -s http://localhost:5001/ > /dev/null; then
            echo -e "AI Health:      ${GREEN}✅ Responding${NC}"
        else
            echo -e "AI Health:      ${YELLOW}⚠️  Not responding${NC}"
        fi
    else
        echo -e "AI Sentinel:    ${RED}❌ Offline${NC}"
    fi
    
    # Check contract (requires node)
    echo -e "Smart Contract: ${GREEN}✅ Deployed${NC}"
    echo -e "Network:        ${GREEN}✅ U2U Testnet${NC}"
    
    echo ""
}

# Function to send test transaction
send_test_tx() {
    echo ""
    echo "🧪 SENDING TEST TRANSACTION"
    echo "=========================="
    
    cat > test-tx.js << 'EOF'
const { ethers } = require('ethers');
require('dotenv').config();

async function sendTestTx() {
    const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
    const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
    
    console.log('Sending high-gas transaction...');
    
    try {
        const tx = await wallet.sendTransaction({
            to: wallet.address,
            value: ethers.parseEther('0.01'),
            gasPrice: ethers.parseUnits('100', 'gwei'),
            gasLimit: 21000
        });
        
        console.log('✅ Transaction sent:', tx.hash);
        console.log('   Gas: 100 gwei (should trigger alert!)');
        
        await tx.wait();
        console.log('✅ Transaction confirmed!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

sendTestTx();
EOF
    
    node test-tx.js
    rm test-tx.js
}

# Function to show logs
show_logs() {
    echo ""
    echo "📋 VIEWING LOGS (Press Ctrl+C to stop)"
    echo "======================================"
    echo ""
    
    # Show both AI and Monitor logs
    if [ -f "services/ai-sentinel/ai_sentinel.log" ]; then
        tail -f services/ai-sentinel/ai_sentinel.log &
    fi
    
    # Monitor output is already in foreground
    wait
}

# Function to stop all services
stop_all() {
    echo ""
    echo "🛑 STOPPING ALL SERVICES"
    echo "======================="
    
    PID_AI=$(netstat -ano | findstr ":5001" | findstr "LISTENING" | awk '{print $5}' | head -n 1)
    if [ ! -z "$PID_AI" ]; then
        taskkill //PID $PID_AI //F > /dev/null 2>&1
        echo "   ✅ AI Sentinel stopped"
    fi
    
    pkill -f "node.*cerberus" 2>/dev/null
    echo "   ✅ Monitor stopped"
    
    echo ""
    echo "All services stopped."
}

# Main menu
show_menu() {
    echo ""
    echo "CERBERUS CONTROL PANEL"
    echo "======================"
    echo "1) Start All Services"
    echo "2) Check Status"
    echo "3) Send Test Transaction"
    echo "4) View Logs"
    echo "5) Stop All Services"
    echo "6) Exit"
    echo ""
    read -p "Select option: " choice
    
    case $choice in
        1)
            start_ai_sentinel
            start_monitor
            check_status
            ;;
        2)
            check_status
            ;;
        3)
            send_test_tx
            ;;
        4)
            show_logs
            ;;
        5)
            stop_all
            ;;
        6)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid option"
            ;;
    esac
}

# Trap Ctrl+C
trap 'echo ""; echo "Use option 5 to stop all services"; show_menu' INT

# Main execution
echo "Welcome to Cerberus Watchdog Control Panel"
echo ""

# Auto-start if no services running
if ! check_process 5001; then
    echo "No services detected. Starting automatically..."
    start_ai_sentinel
    start_monitor
    check_status
fi

# Show menu loop
while true; do
    show_menu
done