// ============================================
// data.js — Portfolio Data Layer (CSE Edition)
// ============================================

const STORAGE_KEY = 'portfolio_data';
const DATA_VERSION = 3; // Bump this to force reset on new deployments

const DEFAULT_DATA = {
  _version: DATA_VERSION,
  general: {
    name: "Siddharth Gupta",
    pageTitle: "Siddharth Gupta | Portfolio",
    tagline: "Freelance Technical Support | Aspiring AI/ML Developer",
    typingTitles: ["AI/ML Learner", "Java Developer", "Python Enthusiast", "Web Developer", "CSE Student"]
  },
  education: [
    {
      school: "BMS Institute of Technology and Management",
      degree: "Bachelor of Technology (B.Tech)",
      major: "Computer Science and Information Science",
      duration: "2025 — 2029",
      description: "Focusing on core CSE fundamentals, Data Structures, and Algorithms. Actively participating in technical societies."
    }
  ],
  experience: [
    {
      company: "Freelance / Local Office Support",
      role: "Technical Specialist",
      duration: "2023 — Present",
      description: "Providing professional IT support and office digitalization services. Managing local infrastructure and documenting learning journeys."
    },
    {
      company: "GitHub / Open Source",
      role: "Self-Project Collaborator",
      duration: "2024 — Present",
      description: "Building daily projects in C, Python, and Unity/C# to master fundamentals and documentation."
    }
  ],
  about: {
    bio1: "I am Siddharth Gupta, a Computer Science student at BMSIT Bengaluru. I'm passionate about building scalable software and exploring the depths of Data Structures and Algorithms.",
    bio2: "Currently diving into AI and Machine Learning, I enjoy turning complex problems into elegant code. My GitHub profile showcases my continuous learning journey through programming fundamentals and real-world projects like Unity-based simulators.",
    skills: [
      { title: "Languages", description: "Java, Python, C++, C, JavaScript, C#" },
      { title: "Tools & Tech", description: "Unity, Git, GitHub, VS Code, Linux" },
      { title: "Core CS", description: "DSA, AI/ML (Basics), Web Dev" },
      { title: "Professional", description: "Technical Support, IT Infrastructure" }
    ]
  },
  projects: [
    {
      title: "C-Programming-Fundamentals",
      description: "Hands-on C programming repository covering memory management, problem-solving, and structured coding from scratch.",
      link: "https://github.com/thesiddharthagupta/C-Programming-Fundamentals",
      language: "C",
      gradient: "gradient-1"
    },
    {
      title: "Python-Project",
      description: "A comprehensive Python learning journey featuring essential programs, exercises, and mini-projects.",
      link: "https://github.com/thesiddharthagupta/Python-Project",
      language: "Python",
      gradient: "gradient-2"
    },
    {
      title: "Python-Programming-Fundamentals",
      description: "An in-depth exploration of Python programming, documenting my progress from basics to intermediate level.",
      link: "https://github.com/thesiddharthagupta/Python-Programming-Fundamentals",
      language: "Python",
      gradient: "gradient-3"
    },
    {
      title: "Personal Portfolio",
      description: "A modern, dynamic portfolio built using HTML, CSS, and Vanilla JavaScript to showcase projects and technical growth.",
      link: "https://github.com/thesiddharthagupta/PORTFOLIO",
      language: "CSS",
      gradient: "gradient-4"
    },
    {
      title: "Python-Programming-",
      description: "Dedicated repository for daily Python challenges and algorithmic problem-solving experiments.",
      link: "https://github.com/thesiddharthagupta/Python-Programming-",
      language: "Python",
      gradient: "gradient-5"
    },
    {
      title: "thesiddharthagupta",
      description: "My official GitHub profile README — a creative overview of my technical skills and goals.",
      link: "https://github.com/thesiddharthagupta/thesiddharthagupta",
      language: "Markdown",
      gradient: "gradient-2"
    },
    {
      title: "Circuit Simulators",
      description: "Enhanced educational circuit simulators for interactive learning, built using Unity and C#.",
      link: "https://github.com/thesiddharthagupta",
      language: "C#",
      gradient: "gradient-1"
    }
  ],
  stats: {
    repos: 7,
    contributions: 485,
    followers: 3,
    githubUser: "thesiddharthagupta"
  },
  contact: {
    email: "thesiddharthagupta@gmail.com"
  },
  socials: {
    github: "https://github.com/thesiddharthagupta",
    linkedin: "https://www.linkedin.com/in/thesiddharthagupta",
    twitter: "https://x.com/thesiddgupta",
    instagram: "https://instagram.com/thesiddgupta"
  },
  footer: {
    copyrightText: "© 2026 Siddharth Gupta — Computer Science Student."
  },
  profile: {
    photo: "",
    fallbackEmoji: "👨‍💻",
    resumeUrl: "",
    resumeFile: "",
    resumeName: "Siddharth_Gupta_Resume.pdf"
  },
  admin: {
    password: "admin123"
  }
};

/** Read portfolio data from localStorage. Falls back to DEFAULT_DATA. */
function getData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // If version mismatch, clear and use defaults (auto-reset on updates)
      if (!parsed._version || parsed._version < DATA_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
      }
      // Merge: only merge scalar/object fields, preserve DEFAULT arrays for fresh installs
      return deepMerge(JSON.parse(JSON.stringify(DEFAULT_DATA)), parsed);
    }
  } catch(e) { console.warn('Could not read portfolio data:', e); }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

/** Deep merge: source overwrites target values (non-array objects only recursively) */
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

/** Save portfolio data to localStorage. */
function saveData(data) {
  if (data) {
    data._version = DATA_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } else {
    const current = getData();
    current._version = DATA_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
}

/** Hard reset: clear ALL portfolio data from localStorage */
function hardReset() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('admin_password');
}

/** Export all portfolio data as a downloadable JSON file. */
function exportPortfolioData() {
  const data = getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfolio-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Import portfolio data from a JSON file. */
function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.general || !data.about || !data.projects) {
          reject(new Error('Invalid portfolio JSON format.'));
          return;
        }
        data._version = DATA_VERSION;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        resolve(data);
      } catch(err) {
        reject(new Error('Invalid JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
