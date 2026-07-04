#!/bin/bash
# Double-click this file in Finder to commit and push the secret-vote changes
cd ~/Documents/Pocket\ Steak\ Apps/GitHub/secret-vote
rm -f .git/index.lock
git add -A
git commit -m "Visual upgrades: shared theme, QR code, progress bars, animations, CI/CD fix, remove debug strings"
git push origin main
echo ""
echo "Done! Check GitHub Actions for deploy status."
read -p "Press Enter to close..."
