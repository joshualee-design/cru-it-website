# CRU Asia Limited — IT Services Website

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![No Frameworks](https://img.shields.io/badge/frameworks-none-informational)

![Screenshot of the CRU Asia Limited website hero section](assets/screenshot.png)

## About

A single-page marketing site for **CRU Asia Limited**, a fictional IT services
provider offering managed IT support, cloud migration, cybersecurity, network
infrastructure, access management, and AI solutions. Built as a course exercise
with plain HTML, CSS, and vanilla JavaScript — no frameworks, no build step.

Sections: hero, services (6 cards), testimonials (desktop grid / mobile
carousel), an enquiry form with full client-side validation and JSON `fetch()`
submission, and a footer.

## Install / run locally

There's no build step — just static files. Because the enquiry form submits via
`fetch()`, open it through a local server rather than double-clicking the HTML
file (the `file://` protocol blocks that request):

```bash
git clone https://github.com/joshualee-design/cru-it-website.git
cd cru-it-website
python -m http.server 8080
# then open http://localhost:8080
```

Any static server works (`npx serve`, VS Code's Live Server, etc.) — Python's is
just built-in on most machines.

To point the enquiry form at a real endpoint, edit the `FORM_ENDPOINT` constant
at the top of [script.js](script.js).

## Credits

Built with [Claude Code](https://claude.com/code) as part of the WSQ *Agentic AI
Applications with Claude Code* course.
