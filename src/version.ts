export const VERSION='0.4.23';
document.title=`v${VERSION} — Core2D`;
const version=document.querySelector<HTMLElement>('.brand-version');
if(version)version.textContent=`v${VERSION}`;
const brand=document.querySelector<HTMLElement>('.brand-title');
if(brand)brand.title=`Core2D v${VERSION}`;
console.info(`[Core2D UI] v${VERSION}`);
