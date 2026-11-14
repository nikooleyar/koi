# Self-check for input validation. Run: python test_main.py (needs no database).
from pydantic import ValidationError

from main import LogIn

ok = LogIn(muscle_group="chest", exercise="  Bench Press ", weight=135)
assert ok.exercise == "Bench Press" and ok.rest_seconds is None

for bad in [
    {"muscle_group": "neck", "exercise": "Shrug", "weight": 100},
    {"muscle_group": "chest", "exercise": "   ", "weight": 100},
    {"muscle_group": "chest", "exercise": "Bench", "weight": -5},
    {"muscle_group": "chest", "exercise": "Bench", "weight": 100, "rest_seconds": -1},
]:
    try:
        LogIn(**bad)
    except ValidationError:
        continue
    raise AssertionError(f"accepted bad input: {bad}")

print("ok")
