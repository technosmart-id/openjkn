# Membership Anomaly Detection: How the Data Checker Works

> A plain-language guide — no technical background needed.
> (For the technical/ML details, see [analitik-anomaly-detection.md](analitik-anomaly-detection.md).)

## In one sentence

**The Membership Anomaly Detection tool is a built-in assistant that scans our JKN
membership data and points out records that look unusual or possibly wrong — so a person
can double-check them.**

Think of it like a **spellchecker for membership data**. It doesn't fix or delete
anything. It just highlights things that deserve a second look.

---

## Why we have it

When you manage a huge number of member records, mistakes sneak in — a wrong birth date, a
child accidentally listed as the head of a family, a member shown as "active" at age 120,
a family with 60 people in it.

Catching these by hand is basically impossible at scale. The checker reads through
everything quickly and hands you a shortlist that says: *"hey, this one looks off — please
take a look."*

---

## How it works (the simple version)

The checker uses **three helpers at the same time**, then combines their opinions:

1. **The Pattern Learner**
   We showed it a huge pile of normal records, so it learned what "normal" looks like. Now,
   when it sees something that doesn't fit the pattern, it raises its hand.

2. **The Odd-One-Out Spotter**
   This one is great at finding the record that stands out from the crowd — like spotting
   the one red marble in a bag of blue ones.

3. **The Checklist**
   A set of plain rules our own team wrote, based on real-world knowledge. For example:
   *"a family head can't be under 12,"* or *"an active member can't be older than 110."*

For every single record, the checker asks all three and combines their answers into one
result. That way no single helper has to be perfect — they back each other up.

---

## What it flags (real examples)

- A member listed as **active at age 120+**
- A **negative age** (a birth date accidentally set in the future)
- A **small child registered as the head of a family**
- A **"child" who is over 25 years old**
- Someone **married before age 16**
- A **family with more than 50 members**
- A family with **almost no active members**

Each flagged record comes with a **simple reason** — not just "looks bad," but *"looks bad
because the family head is 5 years old."*

---

## What you see when you run it

- **A summary** — how many records were checked, how many were flagged, and what
  percentage that is.
- **A list of the suspicious records** — each with a score (how unusual) and a
  plain-language reason.
- **A dashboard with charts** — for example, the age spread of normal records vs. unusual
  ones, so you can see patterns at a glance.

---

## What it does NOT do (important)

- ❌ It **never deletes or changes** any data.
- ❌ It **never makes the final decision** — a human always reviews and decides what's
  really wrong.
- ✅ It's a **highlighter**, not an enforcer. It just says *"please look at this one."*

This makes it safe to use freely: running it changes nothing in your system.

---

## The three steps you actually do

1. **Teach it (once)** — the "Training" step builds the Pattern Learner from your data.
   This is a one-time setup.
2. **Check** — click "Analyze" on either your live database or a file you upload.
3. **Review** — look through the flagged list and decide what, if anything, needs fixing.

---

## One note about openIMIS

This smart-checker is **our own tool**, built into this system. It is **not** part of
openIMIS.

openIMIS is simply the system where our cleaned membership data eventually lives. So the
relationship is easy to remember:

> **The checker reviews the data. openIMIS stores it. They're separate.**

---

*In short: the Membership Anomaly Detection tool is a fast, safe second set of eyes on
millions of records — it points out the weird stuff, and a human takes it from there.*
