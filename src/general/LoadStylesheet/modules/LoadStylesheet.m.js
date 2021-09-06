
export
function loadStylesheet(cssFile) {
	return new Promise(resolve=>{
		var ss = document.styleSheets;
		for (var i = 0, max = ss.length; i < max; i++) {
			if (ss[i].href == cssFile)
				return;
		}
		var link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = cssFile;
		link.onload = resolve;
		
		document.getElementsByTagName("head")[0].appendChild(link);
	});
}
export default loadStylesheet;
