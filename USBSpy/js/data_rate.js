$(document).ready(function() {
	$("#period").on("change", function() {
		console.log($("#period").val());
		switch($("#period").val()){
		case "25":
			set_period_25();
			break;
		case "50":
			set_period_50();
			break;
		default:
		case "100":
			set_period_100();
		}
	});
});

function set_period_100(){
	MSP.send_message(MSP_codes.MSP_PERIOD_100, false, false, function () {

    });
}

function set_period_50(){
	MSP.send_message(MSP_codes.MSP_PERIOD_50, false, false, function () {

    });
}

function set_period_25(){
	MSP.send_message(MSP_codes.MSP_PERIOD_25, false, false, function () {

    });
}