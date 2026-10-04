export interface TechEvent {
  id: string;
  name: string;
  category: string;
  format: 'Solo' | 'Team' | 'Solo / Team';
  fee: number;
  description: string;
  purpose: string;
  procedure: string;
  rules: string[];
  judging: string[];
  teamSize?: string;
}

export const events: TechEvent[] = [
  {
    id: "01",
    name: "CodeDecode 2.0",
    category: "Technical",
    format: "Solo / Team",
    fee: 0,
    description: "Coding challenge focused on logic, problem solving, debugging and implementation speed.",
    purpose: "To test the programming skills, logical thinking, and debugging capabilities of participants.",
    procedure: "Multiple rounds including logic testing, debugging, and rapid implementation challenges.",
    rules: [
      "Only registered participants/teams may compete.",
      "No use of external resources unless specified.",
      "Plagiarism will lead to immediate disqualification.",
      "Judges' decisions are final."
    ],
    judging: [
      "Logic & Accuracy",
      "Time Complexity",
      "Code Efficiency",
      "Problem Solving Speed"
    ]
  },
  {
    id: "02",
    name: "RoboRace 2.0",
    category: "Robotics",
    format: "Team",
    fee: 0,
    description: "Robotics challenge involving design, control, navigation, stability and speed.",
    purpose: "To showcase engineering precision, mechanical design, and control efficiency in robotics.",
    procedure: "Robots must navigate a challenging track with obstacles in the shortest possible time.",
    rules: [
      "Robots must adhere to specified dimensions.",
      "Only one operator per team per run.",
      "Touching the robot during the run may incur penalties.",
      "Safety protocols must be followed at all times."
    ],
    judging: [
      "Time Taken",
      "Control Precision",
      "Robot Stability",
      "Innovation in Design"
    ]
  },
  {
    id: "03",
    name: "AI Build Arena",
    category: "Artificial Intelligence",
    format: "Team",
    fee: 0,
    description: "Teams build a working AI prototype around a defined problem/theme.",
    purpose: "To encourage the practical application of AI and Machine Learning to solve real-world problems.",
    procedure: "Teams will be given a theme and must develop a prototype using AI frameworks within the time limit.",
    rules: [
      "Pre-built models must be declared.",
      "Final prototype must be demonstrable.",
      "Innovation and social impact are encouraged.",
      "API usage is permitted within reasonable limits."
    ],
    judging: [
      "Technical Complexity",
      "Model Accuracy",
      "User Interface",
      "Presentation & Utility"
    ]
  },
  {
    id: "04",
    name: "Cyber Hunt: The Digital Heist",
    category: "Cybersecurity",
    format: "Team",
    fee: 0,
    description: "Cybersecurity challenge involving investigation, logical reasoning, digital clues and practical security concepts.",
    purpose: "To simulate real-world cybersecurity scenarios and test investigative skills.",
    procedure: "A series of digital clues and challenges that require cybersecurity knowledge to solve.",
    rules: [
      "No destructive hacking allowed.",
      "Collaboration between teams is strictly prohibited.",
      "Use of official tools and environments only.",
      "Respect the digital boundary."
    ],
    judging: [
      "Discovery Speed",
      "Logical Reasoning",
      "Accuracy of Findings",
      "Technical Depth"
    ]
  },
  {
    id: "05",
    name: "Ideathon: Problem to Prototype",
    category: "Innovation",
    format: "Team",
    fee: 0,
    description: "Teams identify/receive a real-world problem and develop a feasible solution/prototype concept.",
    purpose: "To foster entrepreneurial thinking and innovative problem-solving.",
    procedure: "Pitching of ideas followed by a prototype concept demonstration.",
    rules: [
      "Ideas must be original.",
      "Feasibility is a core requirement.",
      "Scalability of the solution is considered.",
      "Teams must present their roadmap."
    ],
    judging: [
      "Originality",
      "Impact & Scalability",
      "Feasibility",
      "Presentation Quality"
    ]
  },
  {
    id: "06",
    name: "UI/UX Blitz",
    category: "Design",
    format: "Solo / Team",
    fee: 0,
    description: "Rapid design challenge focused on UX, interface quality, usability, visual hierarchy and communication.",
    purpose: "To challenge designers to create intuitive and aesthetically pleasing user interfaces.",
    procedure: "Participants will design a mobile or web interface for a given problem statement.",
    rules: [
      "Only specified tools (Figma, Adobe XD, etc.) allowed.",
      "Design must follow accessibility standards.",
      "Original assets preferred.",
      "Hierarchy and flow must be clear."
    ],
    judging: [
      "User Experience Flow",
      "Visual Aesthetics",
      "Usability",
      "Design Consistency"
    ]
  },
  {
    id: "07",
    name: "Tech Treasure Hunt",
    category: "Mass Participation",
    format: "Team",
    fee: 0,
    description: "Campus-wide technical treasure hunt involving clues, technology knowledge, observation, navigation and teamwork.",
    purpose: "To engage participants in a fun, technology-themed scavenger hunt.",
    procedure: "Teams solve technical riddles to find locations and eventually the final treasure.",
    rules: [
      "Participants must stay within campus boundaries.",
      "No use of motorized transport.",
      "Respect the campus property.",
      "Fair play is mandatory."
    ],
    judging: [
      "Completion Time",
      "Number of Clues Solved",
      "Teamwork",
      "Strategy"
    ]
  },
  {
    id: "08",
    name: "Gamer Fiesta 2.0",
    category: "E-Sports",
    format: "Team",
    fee: 200,
    description: "Competitive gaming tournament focused on fair play, teamwork, match discipline and transparent tournament progression.",
    purpose: "To provide a platform for competitive e-sports enthusiasts to showcase their skills.",
    procedure: "Bracket-based tournament with strict match timings.",
    rules: [
      "Entry fee of ₹200 per team is mandatory.",
      "No use of cheats or exploits.",
      "Teams must report 15 mins before match time.",
      "Sportsmanship is expected."
    ],
    judging: [
      "Match Performance",
      "Team Coordination",
      "Discipline",
      "Tournament Standing"
    ]
  },
  {
    id: "09",
    name: "Ctrl+Alt+Defeat: Tech Wars",
    category: "Technology Quiz",
    format: "Solo / Team",
    fee: 0,
    description: "Technology quiz covering computing awareness, logic, emerging technologies, cybersecurity, programming and technical knowledge.",
    purpose: "To test the breadth and depth of technical knowledge among students.",
    procedure: "Buzzer rounds and rapid-fire questions on various tech domains.",
    rules: [
      "Quizmaster's word is final.",
      "No use of electronic devices.",
      "Tie-break rules apply.",
      "Questions cover a wide range of tech topics."
    ],
    judging: [
      "Accuracy of Answers",
      "Speed of Response",
      "Range of Knowledge",
      "Strategic Passing"
    ]
  },
  {
    id: "10",
    name: "CEO Quest",
    category: "Management",
    format: "Solo",
    fee: 0,
    description: "Management challenge covering business judgment, leadership, communication, strategy and decision making.",
    purpose: "To identify future leaders through business simulations and decision-making scenarios.",
    procedure: "Participants face management crises and must provide strategic solutions.",
    rules: [
      "Leadership qualities are assessed.",
      "Effective communication is key.",
      "Strategic thinking must be demonstrated.",
      "Time-bound decision making."
    ],
    judging: [
      "Leadership Skill",
      "Decision Accuracy",
      "Communication",
      "Strategic Vision"
    ]
  },
  {
    id: "11",
    name: "TechSnap",
    category: "Reel Coverage & Media",
    format: "Team",
    fee: 0,
    teamSize: "2–4 members",
    description: "Teams create short-form reels covering the TECHSPARDHA experience, competitions, participants, technology, atmosphere and highlights.",
    purpose: "To document the fest's energy and highlights through creative short-form video content.",
    procedure: "Teams capture footage throughout the fest and submit a final edited reel.",
    rules: [
      "Reel must be specifically for TechSpardha 2K26.",
      "Recommended duration: 60–120 seconds.",
      "Only licensed or royalty-free audio.",
      "No obstruction of events or judges.",
      "Minimum quality 720p."
    ],
    judging: [
      "Storytelling (25%)",
      "Cinematography (20%)",
      "Editing & Pacing (20%)",
      "Creativity (20%)",
      "Audience Engagement (15%)"
    ]
  }
];
