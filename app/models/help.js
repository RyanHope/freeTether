function helpData()
{
}

helpData.get = function(lookup)
{
	if (helpData.lookup[lookup])
	{
		return helpData.lookup[lookup];
	}
	else
	{
		return { title: lookup.replace(/_/g, " ").replace(/-/g, " "), data: 'This section isn\'t setup.<br><br>Call a Programmer!<br>Tell Him: "'+lookup+'".' };
	}
	return false; // this shouldn't happen
}

helpData.lookup = 
{
	
	// WiFi
	'network':				{ title: 'Network',					data: 'This changes the ESSID of the WiFi access point.' },
	'security':				{ title: 'Security',				data: 'This changes the encryption used by the WiFi access point.' },
	'passphrase':			{ title: 'Passphrase',				data: 'This is the secret passphrase which is required when connecting to an encrypted WiFi access point.' },
	'set-passphrase':		{ title: 'Set Passphrase',			data: 'This changes secret passphrase used by the WiFi access point.' },
	
	// TCP
	'gateway':				{ title: 'Gateway',					data: 'This changes the router or default gateway IP address.' },
	'subnet':				{ title: 'Subnet',					data: 'This changes the subnet mask for the network which the default gateway is on.' },
	'dhcp-start':			{ title: 'DHCP Pool Start',			data: 'This sets the start of the DHCP lease pool.' },
	'max-leases':			{ title: 'Max DHCP Leases',			data: 'This sets the maximum number of DHCP leases that will be given out at given time.' },
	'lease-time':			{ title: 'DHCP Lease Time',			data: 'This sets (in seconds) how long a DHCP lease will last before expiring.' },
	
	// Bluetooth
	'pan':					{ title: 'PAN Profile',				data: 'This sets enables or disable the personal area network (PAN) bluetooth profile. This option is not 100% functional yet. Use at your own risk.' },
	
	
};