"""
Simple test script to verify API endpoints
"""
import httpx
import json
import asyncio

BASE_URL = "http://localhost:8000"

async def test_health():
    """Test health check endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"✓ Health check: {response.json()}")
        assert response.status_code == 200

async def test_extract():
    """Test extraction endpoint"""
    async with httpx.AsyncClient() as client:
        payload = {
            "url": "https://example.com/hackathon",
            "title": "Example Hackathon",
            "page_text": None
        }
        response = await client.post(f"{BASE_URL}/api/extract", json=payload)
        print(f"✓ Extract test: {response.status_code}")
        if response.status_code != 200:
            print(f"  Response: {response.text}")

async def run_tests():
    """Run all tests"""
    print("🧪 Running API tests...\n")
    try:
        await test_health()
        print("\n✅ All tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(run_tests())
