$(document).ready(function () {
	localize();
	
	$('#status-bar .version').text(chrome.runtime.getManifest().version);
});
