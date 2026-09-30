#!/bin/bash
# check_scope.sh - Ensures changes are restricted to allowed paths

ALLOWED_PATHS="^(docs/library/|tools/library/|backup/library-old/|index\.html)"

CHANGED_FILES=$(git diff --name-only HEAD)

if [ -z "$CHANGED_FILES" ]; then
    echo "No files changed."
    exit 0
fi

VIOLATIONS=0
for FILE in $CHANGED_FILES; do
    if ! echo "$FILE" | grep -Eq "$ALLOWED_PATHS"; then
        echo "VIOLATION: File modified outside allowed paths -> $FILE"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
    echo "check_scope.sh FAILED: $VIOLATIONS violations found."
    exit 1
else
    echo "check_scope.sh PASSED: All changes are within allowed scope."
    exit 0
fi
