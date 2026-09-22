# Álvaro Hernández Gallardo

### Mechatronics Engineer · Robotics, Embedded Systems & Prototyping

I design, build and test systems that connect mechanics, electronics and software. Originally from Ibiza and now based in Barcelona, I am looking for opportunities in robotics, embedded systems, integration and control.

**[Explore the portfolio](https://alvar05.github.io/Personal-Webpage/)** · **[ACME robotics project](https://github.com/Alvar05/ACME_WRO_FE_2023)** · **[Get in touch](mailto:alvaroibz2004@gmail.com)**

This repository contains my interactive portfolio: a first-person journey through a 3D factory, with nine stations covering my education, competition robotics, industrial work and technical skills.

[![English portfolio — Where code meets the real world](assets/preview-en.png)](https://alvar05.github.io/Personal-Webpage/)

## Engineering highlights

| Project | What it involved | Outcome |
| --- | --- | --- |
| **ACME · WRO Future Engineers, 2021** | A team-built self-driving vehicle, including its 3D-printed body, main board and software. | **6th worldwide** in Future Engineers. |
| **ACME · WRO Panama, 2023** | Three ATmega32U4 microcontrollers communicating over I²C; ultrasonic and ToF sensors, an IMU, a camera, and steering and speed PID control. | Competed in the international final. [Team code and engineering notebook](https://github.com/Alvar05/ACME_WRO_FE_2023). |
| **Awayter · Junior Engineer / final-year project, 2025–2026** | An automatic bulk food dispenser with a removable rotary valve and four flexible blades; mechanical design, 3D printing and food trials. | Final-year project graded **9.5/10**. Resolved optical sensor reflections with a **7.5° window tilt and a light trap**. |

**Education:** Mechatronics at the Universitat de Vic · **8.56/10** degree average · highest honours (*Matrícula de Honor*) in **11 courses**. Grades are on the Spanish 0–10 scale.

## Technical focus

- **Mechanics:** CAD, mechanical design, prototyping, 3D printing and experimental iteration.
- **Electronics and control:** sensors, actuators, microcontrollers, I²C communication and PID control.
- **Programming:** hands-on experience with C++ and Python; MATLAB and ROS through coursework.

The ACME competition results reflect team achievements. The linked project repository provides the engineering documentation behind that work.

## The website

The production-line setting connects the presentation to my engineering background. Scrolling moves the camera between workstations, each paired with a chapter of my story.

- **Interactive 3D environment:** procedural geometry and textures, animated robot arms, vehicles and a dispensing mechanism, with project photographs displayed in the scene.
- **Nine connected stations:** introduction, education, robotics beginnings, Thailand 2018, WRO 2021, Panama 2023, Awayter, skills and contact.
- **Direct navigation:** a station map, progress indicator and a persistent contact link.
- **Responsive interface:** layouts and graphics settings adapted for smaller screens and touch devices.
- **Accessibility features:** semantic HTML, labelled form fields, visible keyboard focus, a skip link and reduced-motion adjustments. If Three.js or WebGL is unavailable, JavaScript switches to a stacked document layout.
- **Contact:** a direct email link and a FormSubmit form with browser validation and a honeypot field.

## Technology

**HTML5 · CSS3 · JavaScript · Three.js 0.160.1 · GitHub Pages**

The site is static: no build step, package installation or application server is required. Three.js is loaded from cdnjs, fonts from Google Fonts, and form submissions are handled by FormSubmit. The 3D scene is generated in code; photographs are stored locally in `assets/`.

## Run locally

With Python 3 installed, run this command from the repository root:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Open [localhost:8000](http://localhost:8000). Serve the site over HTTP rather than opening `index.html` directly, so the browser can load the scene textures correctly. An internet connection is needed for the external services above.

## Repository structure

```text
.
├── index.html       English narrative, metadata, navigation and contact form
├── style.css        Responsive layout, panels, station map and visual effects
├── app.js           3D scene, English scene labels, camera and animation
├── assets/          Project photographs, portrait and social preview image
├── .nojekyll        Serve the static files without Jekyll processing
└── README.md
```

## Contact

**Álvaro Hernández Gallardo** · Barcelona, Spain
[alvaroibz2004@gmail.com](mailto:alvaroibz2004@gmail.com) · [GitHub](https://github.com/Alvar05)
