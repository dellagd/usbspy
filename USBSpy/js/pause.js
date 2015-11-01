$(document).ready(function () {
    $('#pause').click(function () {
    	var clicks = $(this).data('clicks');
    	
    	if(clicks){ //play
    		CONFIGURATOR.paused = false;
    		
    		$(this).text(chrome.i18n.getMessage('pause_text')).removeClass('active');
    		console.log("Play");
    	}else{ //pause
    		CONFIGURATOR.paused = true;
    		
    		$(this).text(chrome.i18n.getMessage('pause_text_restart')).addClass('active');
    		console.log("Pause");
    	}
    	
    	$(this).data("clicks", !clicks);
    	
    	
    });
});