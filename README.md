
Live Interview Integrity Analyzer is a browser-based system designed to detect suspicious behavior during online interviews in real time. The shift toward remote hiring has created a serious trust problem: interviewers cannot easily verify whether a candidate is genuinely answering on their own or relying on external assistance such as AI tools, tab switching, off-screen prompts, or background help. This leads to poor hiring decisions, wasted onboarding costs, and erosion of trust in remote interview processes.

Most existing solutions are either invasive, backend-heavy, or focused on blocking behavior rather than understanding it. This project takes a different approach: real-time behavioral analysis directly in the browser, without storing personal data or requiring complex infrastructure.

The application runs entirely on the client side and uses live webcam, microphone, and browser events to analyze multiple signals simultaneously. These signals include eye gaze deviation, face presence, tab switching, copy-paste actions, focus loss duration, and basic audio anomaly patterns. Individually, these signals mean very little. Combined, they form a behavioral profile that can highlight patterns strongly correlated with interview malpractice.

Instead of labeling a candidate as “cheating” (which is risky and subjective), the system generates a Credibility Score that updates continuously throughout the session. This score is derived from a transparent, weighted scoring model that penalizes repeated suspicious behavior while tolerating normal human movement and distractions. Judges and interviewers can clearly see why the score changes, rather than trusting a black-box AI decision.

A key feature is the Timeline Replay Panel, which visualizes detected events across the interview duration. Each marker (tab switch, gaze anomaly, audio spike) is clickable, allowing reviewers to jump directly to moments of concern. This transforms raw signals into actionable insights and makes the system feel enterprise-ready rather than experimental.

This project primarily helps:

HR teams and recruiters conducting remote technical interviews

EdTech platforms running online assessments

Startups and small companies that cannot afford expensive proctoring solutions

The deliberate choice to build this as a frontend-only system demonstrates that meaningful real-time intelligence can exist at the edge, improving privacy, reducing cost, and simplifying deployment. There is no backend dependency, no stored video, and no user tracking beyond the active session.

This is not a concept demo. It is a working system that prioritizes explainability, ethical monitoring, and real-world constraints—exactly what modern remote hiring environments need.
