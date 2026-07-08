"use client";

import { cn } from "../_lib/utils";

const COUNTRY_MAP: Record<string, string> = {
  "USA": "us", "United States": "us", "Canada": "ca", "Mexico": "mx",
  "Argentina": "ar", "Brazil": "br", "Uruguay": "uy", "Colombia": "co",
  "Ecuador": "ec", "Paraguay": "py", "Chile": "cl", "Venezuela": "ve",
  "Bolivia": "bo", "Peru": "pe",
  "England": "gb-eng", "France": "fr", "Germany": "de", "Spain": "es",
  "Portugal": "pt", "Netherlands": "nl", "Italy": "it", "Belgium": "be",
  "Croatia": "hr", "Denmark": "dk", "Switzerland": "ch", "Austria": "at",
  "Poland": "pl", "Ukraine": "ua", "Turkey": "tr", "Serbia": "rs",
  "Scotland": "gb-sct", "Wales": "gb-wls", "Norway": "no", "Sweden": "se",
  "Czech Republic": "cz", "Hungary": "hu", "Slovenia": "si", "Slovakia": "sk",
  "Bosnia & Herzegovina": "ba", "Bosnia and Herzegovina": "ba", "Romania": "ro",
  "Bulgaria": "bg", "Finland": "fi", "Ireland": "ie", "Northern Ireland": "gb-nir",
  "Iceland": "is", "Albania": "al", "North Macedonia": "mk", "Montenegro": "me",
  "Kosovo": "xk", "Greece": "gr", "Israel": "il",
  "Japan": "jp", "South Korea": "kr", "Australia": "au", "Iran": "ir",
  "Saudi Arabia": "sa", "Uzbekistan": "uz", "Jordan": "jo", "UAE": "ae",
  "United Arab Emirates": "ae", "Qatar": "qa", "Iraq": "iq", "Oman": "om",
  "Bahrain": "bh", "China": "cn", "India": "in",
  "Morocco": "ma", "Senegal": "sn", "Egypt": "eg", "Nigeria": "ng",
  "Tunisia": "tn", "Algeria": "dz", "Cameroon": "cm", "Ghana": "gh",
  "Ivory Coast": "ci", "Côte d'Ivoire": "ci", "Mali": "ml", "Burkina Faso": "bf",
  "South Africa": "za", "DR Congo": "cd", "Guinea": "gn", "Zambia": "zm",
  "Kenya": "ke", "Tanzania": "tz", "Uganda": "ug", "Rwanda": "rw",
  "New Zealand": "nz", "Costa Rica": "cr", "Panama": "pa", "Honduras": "hn",
  "Jamaica": "jm", "Guatemala": "gt", "El Salvador": "sv", "Trinidad and Tobago": "tt",
  "Haiti": "ht", "Dominican Republic": "do",
};

export function getCountryCode(name: string): string | null {
  return COUNTRY_MAP[name] ?? null;
}

interface TeamBadgeProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TeamBadge({ name, size = "md", className }: TeamBadgeProps) {
  const code = getCountryCode(name);
  const sizeCls = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-7 w-7";
  
  if (code) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://flagcdn.com/${code}.svg`}
        alt={name}
        className={cn("flex-shrink-0 object-contain", sizeCls, className)}
      />
    );
  }
  return (
    <div className={cn("flex flex-shrink-0 items-center justify-center bg-surface text-[9px] font-bold uppercase text-foreground", sizeCls, className)}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
