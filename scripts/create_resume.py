from pathlib import Path
import shutil

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Akio-Zaki-Salomon-Resume.pdf"
SITE_COPY = ROOT / "images" / "Akio-Zaki-Salomon-Resume.pdf"

PAGE_W, PAGE_H = A4
LEFT = 44
RIGHT = PAGE_W - 44
NAVY = HexColor("#17233C")
BLUE = HexColor("#315A9B")
GOLD = HexColor("#D8A642")
INK = HexColor("#202630")
MUTED = HexColor("#5F6875")
LIGHT = HexColor("#E6EAF0")
WHITE = HexColor("#FFFFFF")


def wrap_text(text, font, size, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if not current or stringWidth(trial, font, size) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_lines(pdf, text, x, y, width, font="Helvetica", size=9.2, leading=13.2, color=INK):
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    for line in wrap_text(text, font, size, width):
        pdf.drawString(x, y, line)
        y -= leading
    return y


def draw_bullet(pdf, text, x, y, width):
    bullet_x = x + 2
    text_x = x + 13
    pdf.setFillColor(GOLD)
    pdf.circle(bullet_x + 2, y + 3, 1.8, fill=1, stroke=0)
    return draw_lines(pdf, text, text_x, y, width - 13, size=8.8, leading=12.2)


def section_heading(pdf, title, y):
    pdf.setFillColor(NAVY)
    pdf.setFont("Helvetica-Bold", 10.2)
    pdf.drawString(LEFT, y, title.upper())
    label_width = stringWidth(title.upper(), "Helvetica-Bold", 10.2)
    pdf.setStrokeColor(LIGHT)
    pdf.setLineWidth(0.8)
    pdf.line(LEFT + label_width + 12, y + 3, RIGHT, y + 3)
    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(2.2)
    pdf.line(LEFT, y - 5, LEFT + 34, y - 5)
    return y - 22


def draw_link(pdf, label, url, x, y, size=8.4, color=WHITE):
    pdf.setFillColor(color)
    pdf.setFont("Helvetica", size)
    pdf.drawString(x, y, label)
    width = stringWidth(label, "Helvetica", size)
    pdf.linkURL(url, (x, y - 2, x + width, y + size + 1), relative=0)
    return width


def build_resume():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4)
    pdf.setTitle("Akio Zaki Salomon - Full-stack Web Developer Resume")
    pdf.setAuthor("Akio Zaki Salomon")
    pdf.setSubject("Professional resume for full-stack and frontend web development roles")
    pdf.setKeywords("Full-stack Web Developer, Frontend Developer, JavaScript, Node.js, Express, C#, SQL")

    # Header
    header_bottom = PAGE_H - 132
    pdf.setFillColor(NAVY)
    pdf.rect(0, header_bottom, PAGE_W, 132, fill=1, stroke=0)
    pdf.setFillColor(GOLD)
    pdf.rect(0, header_bottom, 8, 132, fill=1, stroke=0)
    pdf.setFillColor(WHITE)
    pdf.setFont("Helvetica-Bold", 25)
    pdf.drawString(LEFT, PAGE_H - 48, "AKIO ZAKI SALOMON")
    pdf.setFillColor(GOLD)
    pdf.setFont("Helvetica-Bold", 11.5)
    pdf.drawString(LEFT, PAGE_H - 69, "FULL-STACK WEB DEVELOPER")

    pdf.setFillColor(HexColor("#DCE3EF"))
    pdf.setFont("Helvetica", 8.5)
    pdf.drawString(LEFT, PAGE_H - 91, "Santa Rosa City, Philippines")
    pdf.drawString(LEFT + 152, PAGE_H - 91, "azsalomon69@gmail.com")
    pdf.drawString(LEFT + 326, PAGE_H - 91, "+63 991 919 9421")

    y_links = PAGE_H - 110
    link_color = HexColor("#DCE3EF")
    github_width = draw_link(
        pdf,
        "github.com/azsalomon69-ctrl",
        "https://github.com/azsalomon69-ctrl",
        LEFT,
        y_links,
        color=link_color,
    )
    draw_link(
        pdf,
        "linkedin.com/in/akio-zaki-salomon-900785353",
        "https://www.linkedin.com/in/akio-zaki-salomon-900785353/",
        LEFT + github_width + 28,
        y_links,
        color=link_color,
    )

    y = header_bottom - 28

    # Summary
    y = section_heading(pdf, "Professional Summary", y)
    summary = (
        "Full-stack Web Developer with one year of professional company experience building web applications "
        "across frontend interfaces, backend logic, APIs, and databases. Resourceful, efficiency-focused, and "
        "quality-conscious, with a practical approach to learning tools quickly and delivering maintainable solutions."
    )
    y = draw_lines(pdf, summary, LEFT, y, RIGHT - LEFT, size=9.3, leading=13.5)
    y -= 11

    # Experience
    y = section_heading(pdf, "Professional Experience", y)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 10.5)
    pdf.drawString(LEFT, y, "Full-stack Web Developer")
    pdf.setFillColor(BLUE)
    pdf.setFont("Helvetica-Bold", 8.5)
    pdf.drawRightString(RIGHT, y, "1 YEAR OF COMPANY EXPERIENCE")
    y -= 14
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica-Oblique", 8.6)
    pdf.drawString(LEFT, y, "Confidential private company project")
    y -= 17

    bullets = [
        "Built an AI-assisted recruitment web application that helps HR review applicants and compare candidates with campaign criteria.",
        "Delivered frontend interfaces, backend logic, APIs, database integration, and security-related implementation.",
        "Enabled candidates to be reassessed across campaigns to identify potentially stronger matches when the original campaign was not suitable.",
        "Worked with HTML, CSS, JavaScript, C#, Express, MySQL, GitHub, and Google Sheets.",
        "Protected confidential company information; portfolio screenshots use mock names and mock data.",
    ]
    for item in bullets:
        y = draw_bullet(pdf, item, LEFT, y, RIGHT - LEFT)
        y -= 3
    y -= 7

    # Skills
    y = section_heading(pdf, "Technical Skills", y)
    skill_rows = [
        ("Frontend", "HTML, CSS, JavaScript, React, Vite, Next.js"),
        ("Backend", "Node.js, Express, C#, REST APIs"),
        ("Databases", "SQL, MySQL, PostgreSQL, SQLite"),
        ("Tools", "Git, GitHub, Google Sheets"),
    ]
    label_width = 78
    for label, value in skill_rows:
        pdf.setFillColor(BLUE)
        pdf.setFont("Helvetica-Bold", 8.7)
        pdf.drawString(LEFT, y, label.upper())
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica", 9)
        pdf.drawString(LEFT + label_width, y, value)
        y -= 16
    y -= 5

    # Education
    y = section_heading(pdf, "Education", y)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(LEFT, y, "St. Ignatius Academy")
    pdf.setFillColor(BLUE)
    pdf.setFont("Helvetica-Bold", 8.7)
    pdf.drawRightString(RIGHT, y, "2020 - 2021")
    y -= 15
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica-Bold", 8.8)
    pdf.drawString(LEFT, y, "Information and Communications Technology (ICT) - Web Development")
    y -= 14
    y = draw_lines(
        pdf,
        "Studied frontend and backend development using HTML, CSS, JavaScript, Node.js, Express, and C#.",
        LEFT,
        y,
        RIGHT - LEFT,
        size=8.7,
        leading=12,
        color=MUTED,
    )
    y -= 9

    # Additional information
    y = section_heading(pdf, "Availability and Additional Information", y)
    details = [
        ("Target roles", "Full-stack Web Developer and Frontend Developer"),
        ("Work preference", "Remote; especially open to freelance opportunities"),
        ("Availability", "Weekdays, 5:00 PM - 2:00 AM Philippine Time; one week's notice"),
        ("Languages", "English and Tagalog - fluent"),
        ("Interviews", "Available for online interviews"),
    ]
    half = (RIGHT - LEFT - 26) / 2
    positions = [(LEFT, y), (LEFT + half + 26, y)]
    for index, (label, value) in enumerate(details):
        column = 0 if index < 3 else 1
        row = index if index < 3 else index - 3
        x = positions[column][0]
        line_y = positions[column][1] - row * 31
        pdf.setFillColor(BLUE)
        pdf.setFont("Helvetica-Bold", 7.9)
        pdf.drawString(x, line_y, label.upper())
        draw_lines(pdf, value, x, line_y - 12, half, size=8.5, leading=11, color=INK)

    y -= 105
    y = section_heading(pdf, "Professional Strengths", y)
    strengths = [
        "End-to-end development across interfaces, backend logic, APIs, databases, and security-related implementation.",
        "Resourceful problem solving that uses appropriate tools and reusable solutions to improve speed without lowering quality.",
        "Clear English communication for remote collaboration with employers, clients, and international teams.",
    ]
    for item in strengths:
        y = draw_bullet(pdf, item, LEFT, y, RIGHT - LEFT)
        y -= 3

    # Footer
    pdf.setStrokeColor(LIGHT)
    pdf.setLineWidth(0.8)
    pdf.line(LEFT, 31, RIGHT, 31)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 7.4)
    pdf.drawString(LEFT, 18, "Portfolio: Full-stack web development, frontend development, APIs, databases, and security-related implementation")
    pdf.drawRightString(RIGHT, 18, "Akio Zaki Salomon")

    pdf.showPage()
    pdf.save()
    shutil.copyfile(OUTPUT, SITE_COPY)
    print(OUTPUT)
    print(SITE_COPY)


if __name__ == "__main__":
    build_resume()
