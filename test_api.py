#!/usr/bin/env python3
"""
Simple test script to verify the Solana AI Trader API connection
"""

import requests
import json
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Get API key
api_key = os.getenv('NOLIMITNODES_API_KEY')
print(f"API Key loaded: {'Yes' if api_key else 'No'}")
print(f"API Key (first 10 chars): {api_key[:10]}..." if api_key else "No API key found")

# Test NoLimitNodes connection
nolimitnodes_url = os.getenv('NOLIMITNODES_RPC_URL', 'https://api.nolimitnodes.com/solana_mainnet')
print(f"\nTesting connection to: {nolimitnodes_url}")

try:
    # Test RPC connection with a simple getHealth request
    headers = {'Content-Type': 'application/json'}
    data = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getHealth"
    }
    
    # Add API key to URL if available
    if api_key:
        url = f"{nolimitnodes_url}?apikey={api_key}"
    else:
        url = nolimitnodes_url
    
    response = requests.post(url, headers=headers, json=data, timeout=10)
    print(f"Response Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"RPC Response: {json.dumps(result, indent=2)}")
        print("\n✅ NoLimitNodes RPC connection successful!")
    else:
        print(f"Error: {response.text}")
        
except Exception as e:
    print(f"❌ Connection failed: {str(e)}")

print("\n" + "="*50)
print("Configuration Summary:")
print(f"- API Key configured: {'✅' if api_key else '❌'}")
print(f"- RPC URL: {nolimitnodes_url}")
print(f"- Project directory: {os.getcwd()}")
print("="*50)