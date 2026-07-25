import os
import re
import subprocess
import json

PATTERNS = {
    "Google API Key": r"AIzaSy[A-Za-z0-9_\-]{35}",
    "NVIDIA API Key": r"nvapi-[A-Za-z0-9_\-]{64}",
    "Gemini/Perplexity/Generic Secret Key": r"(?:sk-|key-|secret_)[A-Za-z0-9_\-]{32,}",
    "AWS Access Key ID": r"AKIA[A-Z0-9]{16}",
    "AWS Secret Access Key": r"AWS_SECRET_ACCESS_KEY\s*=\s*[A-Za-z0-9/+=]{40}",
    "JWT Secret": r"JWT_SECRET\s*=\s*[A-Za-z0-9_\-]{20,}",
    "Google OAuth Client ID": r"[0-9]+-[A-Za-z0-9_\-]+\.apps\.googleusercontent\.com",
}

EXCLUDE_DIRS = {".git", "node_modules", ".next", ".venv", "out", "build", "dist"}
EXCLUDE_FILES = {
    "package-lock.json",
    "tsconfig.tsbuildinfo",
    "secret_scanner.py",
    "DELETED_SECRETS.md",
}

def scan_working_tree():
    findings = []
    for root, dirs, files in os.walk(".", topdown=True):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            if file in EXCLUDE_FILES:
                continue
            filepath = os.path.join(root, file)
            # Skip binary files
            if filepath.endswith((".png", ".jpg", ".jpeg", ".ico", ".svg", ".zip", ".pdf")):
                continue
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    for name, pattern in PATTERNS.items():
                        matches = re.findall(pattern, content)
                        for m in matches:
                            # Avoid matching placeholders
                            if "your_" in m or "change_me" in m or "placeholder" in m:
                                continue
                            findings.append({
                                "file": filepath.replace("\\", "/"),
                                "type": name,
                                "match": m[:8] + "..." + m[-4:] if len(m) > 12 else m,
                                "in_git_history": "No"
                            })
            except Exception as e:
                pass
    return findings

def scan_git_history():
    findings = []
    try:
        # Run git log -p to get all diffs in history
        result = subprocess.run(
            ["git", "log", "-p", "--all"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore"
        )
        if result.returncode == 0:
            content = result.stdout
            lines = content.split("\n")
            current_commit = ""
            current_file = ""
            for line in lines:
                if line.startswith("commit "):
                    current_commit = line.split(" ")[1].strip()
                elif line.startswith("+++ b/"):
                    current_file = line[6:].strip()
                elif line.startswith("+") and not line.startswith("+++"):
                    added_text = line[1:]
                    for name, pattern in PATTERNS.items():
                        matches = re.findall(pattern, added_text)
                        for m in matches:
                            if "your_" in m or "change_me" in m or "placeholder" in m:
                                continue
                            findings.append({
                                "file": f"Git History (Commit: {current_commit[:8]} - File: {current_file})",
                                "type": name,
                                "match": m[:8] + "..." + m[-4:] if len(m) > 12 else m,
                                "in_git_history": "Yes"
                            })
    except Exception as e:
        print("Git log execution failed:", e)
    return findings

def main():
    print("Starting Secret Scan...")
    working_tree_findings = scan_working_tree()
    history_findings = scan_git_history()
    
    all_findings = working_tree_findings + history_findings
    
    # Deduplicate findings
    unique_findings = []
    seen = set()
    for f in all_findings:
        key = (f["file"], f["type"], f["match"])
        if key not in seen:
            seen.add(key)
            unique_findings.append(f)
            
    print(f"\nScan completed. Found {len(unique_findings)} unique findings.")
    print(json.dumps(unique_findings, indent=2))
    
    # Write report
    with open("SECRET_INVENTORY_REPORT.json", "w") as f:
        json.dump(unique_findings, f, indent=2)

if __name__ == "__main__":
    main()
