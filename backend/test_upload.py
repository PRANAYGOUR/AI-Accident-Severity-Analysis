import requests
url = 'http://localhost:5000/upload'
file_path = '../dataset/data/train/Accident/test10_10.jpg'
files = {'media': open(file_path, 'rb')}
try:
    print("Testing upload...")
    response = requests.post(url, files=files, timeout=10)
    print("Status code:", response.status_code)
    print("Response text:", response.text)
except Exception as e:
    print("Exception:", e)
