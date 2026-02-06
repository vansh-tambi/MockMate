#!/usr/bin/env python3
"""
Validate all JSON files in the data directory.
Reports any JSON syntax errors.
"""

import json
from pathlib import Path

DATA_DIR = Path("ai_service/data")

def validate_json_file(filepath: Path) -> tuple[bool, str]:
    """Validate a JSON file and return (is_valid, error_msg)."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            json.load(f)
        return True, "✅ Valid"
    except json.JSONDecodeError as e:
        return False, f"❌ JSON Error (line {e.lineno}): {e.msg}"
    except Exception as e:
        return False, f"❌ Error: {e}"

def main():
    print("=" * 80)
    print("VALIDATING ALL JSON FILES")
    print("=" * 80)
    
    files = sorted(DATA_DIR.glob("*.json"))
    total_files = len(files)
    valid_files = 0
    errors = []
    
    for filepath in files:
        is_valid, msg = validate_json_file(filepath)
        status = "✅" if is_valid else "❌"
        print(f"{status} {filepath.name:50} {msg}")
        
        if is_valid:
            valid_files += 1
        else:
            errors.append((filepath.name, msg))
    
    print("=" * 80)
    print(f"SUMMARY: {valid_files}/{total_files} files valid")
    print("=" * 80)
    
    if errors:
        print("\nERRORS FOUND:")
        for filename, error_msg in errors:
            print(f"  {filename}: {error_msg}")
        return 1
    
    print("\n✅ ALL FILES VALID - 0 ERRORS")
    return 0

if __name__ == "__main__":
    exit(main())
