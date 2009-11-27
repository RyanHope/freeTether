var connectionInfo	= {}

function palmServices() {}

palmServices.cmGetStatus = function(onSuccess, onFailure)
{
	var request = new Mojo.Service.Request('luna://com.palm.connectionmanager',
	{
		method: 'getstatus',
		parameters: {
			"subscribe":true
		},
		onSuccess: onSuccess,
		onFailure: onFailure
	});

	return request;
}