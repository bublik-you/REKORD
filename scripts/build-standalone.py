"""Pack the presentation into a single offline HTML file. No third-party dependencies."""
from pathlib import Path
import base64,json,re
root=Path(__file__).resolve().parents[1];dist=root/'dist'
html=(dist/'index.html').read_text()
for family in ['pixel','golos']:
 css=(dist/'fonts'/f'{family}.css').read_text()
 def embed_font(m):
  name=m[1];binary=(dist/'fonts'/name).read_bytes()
  return 'url(data:font/ttf;base64,'+base64.b64encode(binary).decode()+')'
 css=re.sub(r'url\(([^)]+)\)',embed_font,css)
 html=html.replace(f'<link rel="stylesheet" href="fonts/{family}.css">','<style>'+css+'</style>')
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(dist/'style.css').read_text()+'</style>')
data=json.dumps(json.loads((dist/'map-data.json').read_text()),ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
js=(dist/'app.js').read_text().replace('</script','<\\/script')
html=html.replace('<script src="app.js" defer></script>','<script id="embeddedMapData" type="application/json">'+data+'</script>\n<script>'+js+'</script>')
# A downloaded copy can be saved again without consulting a server.
html=html.replace('<script>'+js+'</script>', '<script>'+js+"\nfor(const a of document.querySelectorAll('a[download]'))a.addEventListener('click',e=>{if(location.protocol==='file:'){e.preventDefault();const blob=new Blob(['<!doctype html>\\n'+document.documentElement.outerHTML],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='rekord-presentation.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}});"+'</script>')
file=dist/'rekord-presentation.html';file.write_text(html);print(f'{file.name}: {file.stat().st_size:,} bytes, self-contained')
