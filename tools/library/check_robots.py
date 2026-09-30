import urllib.request
import urllib.error

sources = [
    "https://www.fabulang.com",
    "https://learnenglish-new.com",
    "https://wooenglish.com",
    "https://www.inklingo.app",
    "https://readlang.com",
    "https://english-e-reader.net"
]

for url in sources:
    robots_url = url + "/robots.txt"
    try:
        req = urllib.request.Request(robots_url, headers={'User-Agent': 'Mozilla/5.0 Wordloom-Library-Rebuild'})
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            content = response.read().decode('utf-8')
            disallowed = len([line for line in content.split('\n') if line.strip().lower().startswith('disallow')])
            print(f"{url}: HTTP {status}, {disallowed} Disallow rules.")
    except urllib.error.URLError as e:
        print(f"{url}: ERROR - {e.reason}")
    except Exception as e:
        print(f"{url}: ERROR - {str(e)}")
