import asyncio
import json
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
import pandas as pd
from datetime import datetime
import time
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

U2U_RPC = "https://rpc-nebulas-testnet.uniultra.xyz"
BLOCKS_TO_SCAN = 5000
BATCH_SIZE = 50

class U2UDataCollector:
    """Collect real transaction data from U2U Network"""
    
    def __init__(self, rpc_url: str):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={'timeout': 60}))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        
        if not self.w3.is_connected():
            raise ConnectionError("Cannot connect to U2U Network")
        
        logger.info(f"✅ Connected to U2U Network")
        logger.info(f"📊 Latest block: {self.w3.eth.block_number}")
    
    def extract_transaction_features(self, tx, receipt=None) -> Dict:
        """Extract features dari transaction untuk ML model"""
        try:
            features = {
                'hash': tx['hash'].hex() if isinstance(tx['hash'], bytes) else str(tx['hash']),
                'from': tx.get('from', ''),
                'to': tx.get('to', '') if tx.get('to') else None,
                'value': float(self.w3.from_wei(int(tx.get('value', 0)), 'ether')),
                'gas': int(tx.get('gas', 0)),
                'gasPrice': int(tx.get('gasPrice', 0)),
                'nonce': int(tx.get('nonce', 0)),
                'blockNumber': int(tx.get('blockNumber', 0)),
            }
            
            features['isContractCreation'] = 1 if tx.get('to') is None else 0
            
            input_data = tx.get('input', '0x')
            if isinstance(input_data, bytes):
                input_data = input_data.hex()
            features['inputLength'] = len(input_data)
            features['hasInput'] = 1 if len(input_data) > 2 else 0
            
            if len(input_data) > 10:
                features['functionSelector'] = input_data[:10]
            else:
                features['functionSelector'] = None
            
            if receipt:
                features['gasUsed'] = int(receipt.get('gasUsed', 0))
                features['status'] = int(receipt.get('status', 0))
                features['logsCount'] = len(receipt.get('logs', []))
                
                if features['gas'] > 0:
                    features['gasEfficiency'] = features['gasUsed'] / features['gas']
                else:
                    features['gasEfficiency'] = 0
            else:
                features['gasUsed'] = features['gas']
                features['status'] = 1
                features['logsCount'] = 0
                features['gasEfficiency'] = 0.7
            
            features['valueDensity'] = features['value'] / max(features['gasUsed'], 1)
            features['gasPrice_gwei'] = self.w3.from_wei(features['gasPrice'], 'gwei')
            
            features['timestamp'] = datetime.now().isoformat()
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return None
    
    def collect_block_transactions(self, block_number: int) -> List[Dict]:
        """Collect all transactions from a specific block"""
        try:
            block = self.w3.eth.get_block(block_number, full_transactions=True)
            transactions = []
            
            for tx in block.get('transactions', []):
                try:
                    receipt = self.w3.eth.get_transaction_receipt(tx['hash'])
                except Exception:
                    receipt = None
                
                features = self.extract_transaction_features(tx, receipt)
                if features:
                    transactions.append(features)
            
            if len(transactions) > 0:
                logger.info(f"📦 Block {block_number}: {len(transactions)} transactions")
            return transactions
            
        except Exception as e:
            logger.debug(f"Error on block {block_number}: {e}")
            return []
    
    def collect_historical_data(self, num_blocks: int = BLOCKS_TO_SCAN) -> pd.DataFrame:
        """Collect historical transaction data"""
        latest_block = self.w3.eth.block_number
        start_block = max(0, latest_block - num_blocks)
        
        logger.info(f"🚀 Starting data collection...")
        logger.info(f"📊 Scanning blocks {start_block} to {latest_block}")
        
        all_transactions = []
        
        for batch_start in range(start_block, latest_block, BATCH_SIZE):
            batch_end = min(batch_start + BATCH_SIZE, latest_block)
            
            logger.info(f"⚙️ Batch: {batch_start}-{batch_end}")
            
            for block_num in range(batch_start, batch_end):
                transactions = self.collect_block_transactions(block_num)
                all_transactions.extend(transactions)
                time.sleep(0.05)
            
            if len(all_transactions) > 0 and batch_start % 500 == 0:
                temp_df = pd.DataFrame(all_transactions)
                temp_df.to_csv(f'temp_data_{batch_start}.csv', index=False)
                logger.info(f"💾 Progress saved: {len(all_transactions)} txs")
        
        df = pd.DataFrame(all_transactions)
        logger.info(f"✅ Collected {len(df)} transactions")
        
        return df
    
    def label_suspicious_transactions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Label suspicious transactions"""
        logger.info("🏷️ Labeling suspicious transactions...")
        
        df['is_malicious'] = 0
        df['threat_category'] = 'NORMAL'
        df['threat_reason'] = ''
        
        if len(df) > 10:
            gas_threshold = df['gasPrice'].quantile(0.98)
            front_running = (df['gasPrice'] > gas_threshold * 2) & (df['value'] > 0.1)
            df.loc[front_running, 'is_malicious'] = 1
            df.loc[front_running, 'threat_category'] = 'FRONT_RUNNING'
            df.loc[front_running, 'threat_reason'] = 'High gas price with value'
        
        honeypot = (df['isContractCreation'] == 1) & (df['gas'] < 100000)
        df.loc[honeypot, 'is_malicious'] = 1
        df.loc[honeypot, 'threat_category'] = 'HONEY_POT'
        df.loc[honeypot, 'threat_reason'] = 'Suspicious contract deployment'
        
        if len(df) > 10:
            gas_high = df['gas'].quantile(0.95)
            exploit = (df['value'] > 5) & (df['gas'] > gas_high)
            df.loc[exploit, 'is_malicious'] = 1
            df.loc[exploit, 'threat_category'] = 'SMART_CONTRACT_EXPLOIT'
            df.loc[exploit, 'threat_reason'] = 'Large value with excessive gas'
        
        if len(df) > 10:
            gas_high = df['gas'].quantile(0.90)
            failed = (df['status'] == 0) & (df['gas'] > gas_high)
            df.loc[failed, 'is_malicious'] = 1
            df.loc[failed, 'threat_category'] = 'SMART_CONTRACT_EXPLOIT'
            df.loc[failed, 'threat_reason'] = 'Failed transaction with high gas'
        
        malicious_count = int(df['is_malicious'].sum())
        percentage = (malicious_count / len(df) * 100) if len(df) > 0 else 0
        logger.info(f"🚨 Labeled {malicious_count} suspicious ({percentage:.2f}%)")
        
        return df
    
    def save_dataset(self, df: pd.DataFrame, filename: str = 'cerberus_training_data.csv'):
        """Save dataset"""
        df.to_csv(filename, index=False)
        logger.info(f"💾 Dataset saved: {filename}")
        
        summary = {
            'total_transactions': int(len(df)),
            'malicious_transactions': int(df['is_malicious'].sum()),
            'normal_transactions': int((df['is_malicious'] == 0).sum()),
            'threat_categories': df['threat_category'].value_counts().to_dict(),
            'collection_date': datetime.now().isoformat(),
            'blocks_scanned': BLOCKS_TO_SCAN,
        }
        
        with open('dataset_summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"📊 Summary:")
        logger.info(f"   Total: {summary['total_transactions']}")
        logger.info(f"   Malicious: {summary['malicious_transactions']}")
        logger.info(f"   Normal: {summary['normal_transactions']}")

def main():
    print("="*80)
    print("🐺 CERBERUS DATA COLLECTOR (Python 3.13 Compatible)")
    print("="*80)
    print()
    
    try:
        collector = U2UDataCollector(U2U_RPC)
        
        print("\n📡 Collecting data from U2U Network...")
        df = collector.collect_historical_data(BLOCKS_TO_SCAN)
        
        if len(df) == 0:
            logger.error("❌ No data collected")
            return
        
        df = collector.label_suspicious_transactions(df)
        collector.save_dataset(df)
        
        print("\n" + "="*80)
        print("✅ DATA COLLECTION COMPLETE!")
        print("="*80)
        print(f"\n📁 File: cerberus_training_data.csv")
        print(f"📊 Summary: dataset_summary.json")
        print(f"\n🚀 Next: python advanced_trainer.py")
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()