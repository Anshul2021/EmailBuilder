// Popular Google Fonts for email templates
export const GOOGLE_FONTS = [
    "Arial",
    "Helvetica",
    "Georgia",
    "Times New Roman",
    "Courier New",
    "Verdana",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Raleway",
    "Poppins",
    "Nunito",
    "Ubuntu",
    "Playfair Display",
    "Merriweather",
    "PT Sans",
    "Source Sans Pro",
    "Oswald",
    "Slabo 27px",
    "Inter",
    "Work Sans",
    "Quicksand",
    "Karla",
    "Rubik",
    "DM Sans",
    "Mulish",
    "Josefin Sans",
    "Fira Sans",
    "IBM Plex Sans",
];

export function searchFonts(query: string): string[] {
    if (!query.trim()) return GOOGLE_FONTS;
    const lowerQuery = query.toLowerCase();
    return GOOGLE_FONTS.filter(font => font.toLowerCase().includes(lowerQuery));
}

export function loadGoogleFont(fontFamily: string): void {
    // Check if font is already loaded
    const existingLink = document.getElementById(`font-${fontFamily.replace(/\s+/g, "-")}`);
    if (existingLink) return;

    // Don't load system fonts
    const systemFonts = ["Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana"];
    if (systemFonts.includes(fontFamily)) return;

    // Load Google Font
    const link = document.createElement("link");
    link.id = `font-${fontFamily.replace(/\s+/g, "-")}`;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}:wght@400;700&display=swap`;
    document.head.appendChild(link);
}
