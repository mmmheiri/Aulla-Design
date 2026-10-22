const descriptions: Record<string,string> = {
 AgSCVfoKPto5gvZLaIXS:"Blazer-style abaya.",
 F1jpRXgfEkjY8cB2X6oG:"Hand-worked embroidery with decorative stones. Fabric described by the seller as chiffon crepe.",
 KUWu4eRhxapcFV8ze8w9:"Abaya with a lace-trimmed shayla. Fabric described by the seller as Korean nida.",
 PclIvJotHUeGUOjqk7G5:"Lined cotton abaya, described by the seller as suitable for all seasons.",
 SoQvVUKJ4KX4igEPHaq4:"The black section is available in Korean nida or velvet.",
 afW0h6iCRpPhAA77FwpR:"Velvet abaya with an embroidered shayla. Listed by the seller as a popular piece.",
 eB2ukaigB7ZRn4QmJm81:"Fabric described by the seller as Korean nida.",
 kKLpmOxZspGNMmQFbaYJ:"Fabric described by the seller as Korean nida. Listed by the seller as a popular piece.",
 knwEQbiwWA9RLQ6QirLB:"Abaya with a lace-trimmed shayla.",
 lnPglpYAhuumNm2wHhtA:"Plain, lined velvet abaya.",
 qATxMkX6SIEBaa1jlBDu:"No description has been provided for this piece."
};
export const translatedDescription=(id:string,original:string,locale:"ar"|"en")=>locale==="ar"?(original.trim()||"لا يوجد وصف منشور لهذه القطعة."):(descriptions[id]??"See the photographs and available options for this piece.");
