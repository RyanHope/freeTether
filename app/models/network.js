var connectionInfo = {}

network.identifier = 'luna://com.palm.connectionmanager';

function network() {}

network.cmGetStatus = function(onSuccess, onFailure)
{
	var request = new Mojo.Service.Request(network.identifier,
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