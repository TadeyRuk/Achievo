#!/usr/bin/env python3
import os
import re
import subprocess
import datetime

def run_cmd(cmd):
    try:
        result = subprocess.run(cmd, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command '{cmd}': {e.stderr}")
        return ""

def get_today_commits():
    # Gets commits since midnight today
    commits = run_cmd('git log --since="00:00:00" --pretty=format:"- %s (%h)"')
    return commits if commits else "- No commits recorded today yet."

def get_today_changes():
    # Gets modified and untracked files
    diff_files = run_cmd('git diff --name-only').splitlines()
    untracked_files = [line[3:] for line in run_cmd('git status --porcelain').splitlines() if line.startswith('?? ')]
    
    all_changes = sorted(list(set(diff_files + untracked_files)))
    # Exclude vault metadata and node_modules/scripts
    filtered = [f for f in all_changes if not f.startswith('.obsidian') and not f.startswith('node_modules')]
    
    if not filtered:
        return "- No code files modified today yet."
    return "\n".join(f"- `{f}`" for f in filtered)

def update_daily_log(today_str):
    log_dir = "Daily Logs"
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, f"{today_str}.md")
    
    commits = get_today_commits()
    changes = get_today_changes()
    
    manual_notes = "- Initialized vault and project structure."
    if os.path.exists(log_path):
        # Extract manual notes if the file already exists
        with open(log_path, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r"## 📝 Manual Notes\n(.*)", content, re.DOTALL)
        if match:
            manual_notes = match.group(1).strip()
            
    log_content = f"""# 📅 Daily Log — {today_str}

## 🎯 Today's Goals
- Continue implementing the Achievo system.

## 💻 Automated Activity
- **Git Commits**:
{commits}

## 🔧 Code Changes
- **Files Modified**:
{changes}

## 📝 Manual Notes
{manual_notes}
"""
    with open(log_path, 'w', encoding='utf-8') as f:
        f.write(log_content)
    print(f"Daily log updated: {log_path}")
    return log_path

def get_file_status(file_path):
    if not os.path.exists(file_path):
        return "⏳ Not Started"
    
    # Check if file is currently modified or untracked in git
    status_output = run_cmd(f'git status --porcelain "{file_path}"')
    if status_output:
        return "🚧 In Progress"
    return "✅ Completed"

def update_index_status(today_str):
    index_path = "Index.md"
    if not os.path.exists(index_path):
        print("Index.md not found!")
        return
        
    with open(index_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    updated_lines = []
    in_table = False
    
    for line in lines:
        # Update last updated line
        if "*Last updated:" in line:
            line = f"*Last updated: [[{today_str}]]*\n"
            
        # Parse and update table row
        if "|" in line:
            parts = [p.strip() for p in line.split("|")]
            # Check if it looks like a component status row
            if len(parts) >= 4 and parts[3].startswith("`") and parts[3].endswith("`"):
                file_path = parts[3].replace("`", "")
                status = get_file_status(file_path)
                parts[2] = status
                line = " | ".join(parts) + "\n"
        updated_lines.append(line)
        
    with open(index_path, 'w', encoding='utf-8') as f:
        f.writelines(updated_lines)
    print("Index.md component status table updated.")

def main():
    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    
    # Update Daily Log
    update_daily_log(today_str)
    
    # Update Index Status Table
    update_index_status(today_str)
    
    # Stage changes in Git
    run_cmd("git add Index.md Daily\\ Logs/")
    print("Vault changes staged in Git.")

if __name__ == "__main__":
    main()
