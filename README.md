# Koi

> **Work in progress.** Koi is early and changing often.

Koi is a self-hosted gym app. You run it on your own server, and every workout you log is
stored there in your own database.

It's built to be used from your phone at the gym (it installs as a web app on your home
screen), but it works just as well in a desktop browser.

## What it does today

- Log lifts by muscle group (chest, arms, legs, back): exercise, weight and rest time
- Remembers past exercises for easier input
- See your weight as graph trends
- Track body weight over time

## Future goals

The main goal is **machine learning on your own health data**: finding patterns between
how you recover and how you actually perform in the gym. For example:

- Does a bad night's sleep show up in lifts the next day, or two days later?
- How do HRV and resting heart rate relate to strength numbers?

To get there, Koi will pull in recovery data from an **Oura ring** (sleep, HRV, resting
heart rate, readiness) and/or an **Apple Watch** (heart rate during workouts, steps), and line
it up with your logged sets. Since it's only one person's data, results will be reported
honestly, including how strong or weak each pattern really is. All done within a self-hosted server. 

Other planned pieces along the way:

- Sets and reps, with estimated one-rep maxes and personal records
- A rest timer, and logging that works offline and syncs later
- Grafana dashboards for exploring the data
