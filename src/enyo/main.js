enyo.kind({

	name: 'freeTether',
	kind: enyo.VFlexBox,
	align: 'center',
	
	className: 'main',

	prefs: new Prefs(),

	components: [
		{kind: 'Toolbar', width: '100%', className: 'enyo-toolbar-light', components: [
			{flex: 1},
			{kind: 'Control', content: 'Tetherable Interfaces'},
			{flex: 1}
		]},
		{flex: 1},
		{kind: 'HFlexBox', width: '100%', align: 'center', components: [
			{flex: 1},
			{kind: 'VFlexBox', align: 'center', components: [
				{kind: 'Button', width: '74px', name: 'wifi', onclick: 'showPrefs', components: [
  				{name: 'wifiIcon', className: 'wifiIcon'},
  				{content: 'WiFi'}
				]},
  			{kind: 'ToggleButton'}
			]},
			{flex: 1},
			{kind: 'VFlexBox', align: 'center', components: [
				{kind: 'Button', width: '74px', name: 'usb', onclick: 'showPrefs', components: [
  				{name: 'usbIcon', className: 'usbIcon'},
  				{content: 'USB'}
				]},
  			{kind: 'ToggleButton'}
			]},
			{flex: 1},
			{kind: 'VFlexBox', align: 'center', components: [
				{kind: 'Button', width: '74px', name: 'bluetooth', onclick: 'showPrefs', components: [
  				{name: 'bluetoothIcon', className: 'bluetoothIcon'},
  				{content: 'Bluetooth'}
				]},
  			{kind: 'ToggleButton'}
			]},
			{flex: 1}
  	]},
  	{flex: 1},
  	{kind: 'Toolbar', width: '100%', className: 'enyo-toolbar-light', components: [
  		{content: '192.168.0.1/24', style: 'padding-right: 8px;', name: 'tcp', onclick: 'showPrefs'}
  	]},
		{kind: 'Scrim', name: 'mainScrim', showing: false, components:[
			{layoutKind: "VFlexLayout", height: '100%', width: '100%', pack: 'center', align: 'center', components: [
				{kind: 'SpinnerLarge', showing: true}
			]}
		]},
		{name: "wifiPrefs", kind: "Pullout", height: '100%', width: '100%', className: "enyo-bg", flyInFrom: "right", components: [
			{kind: 'Toolbar', width: '100%', className: 'enyo-toolbar-light', components: [
				{flex: 1},
				{kind: 'Control', content: 'Wifi Preferences'},
				{flex: 1}
			]},
			{kind: 'RowGroup', components: [
        {kind: 'Input', value: 'freeTether', hint: '', components: [
        	{content: 'Network', className: 'ft-label'}
        ]},
        {layoutKind: 'HFlexLayout', align: 'center', pack: 'middle', width: '100%', components: [
      		{content: 'Security', className: 'ft-label', flex: 1},
    			{kind: 'ListSelector', value: 'Open', items: ['Open', 'WPA2 Personal']}
      	]},
      	{layoutKind: 'HFlexLayout', width: '100%', components: [
      		{content: 'BowlOfDicks', flex: 1},
        	{content: 'Passphrase', className: 'ft-label'}
        ]},
				{layoutKind: 'HFlexLayout', width: '100%', components: [
					{kind: 'Button', flex: 1, allowHtml: true, content: 'Hide<br>Passphrase'},
        	{kind: 'Button', flex: 1, allowHtml: true, content: 'Set<br>Passphrase'}
        ]}
    	]},
			{flex: 1},
			{kind: 'Toolbar', width: '100%', className: 'enyo-toolbar-light', components: [
				{kind: 'GrabButton'},
				{flex: 1},
				{content: 'Restore Defaults'}
			]},
		]},
		{name: "bluetoothPrefs", kind: "Pullout", height: '100%', width: '100%', className: "enyo-bg", flyInFrom: "right", components: [
			{kind: 'Toolbar', width: '100%', className: 'enyo-toolbar-light', components: [
				{flex: 1},
				{kind: 'Control', content: 'Bluetooth Preferences'},
				{flex: 1}
			]},
			{flex: 1},
			{kind: 'Toolbar', width: '100%', className: 'enyo-toolbar-light', components: [
				{kind: 'GrabButton'}
			]},
		]},
		{name: "usbPrefs", kind: "Pullout", height: '100%', width: '100%', className: "enyo-bg", flyInFrom: "right", components: [
			{kind: 'Toolbar', width: '100%', className: 'enyo-toolbar-light', components: [
				{flex: 1},
				{kind: 'Control', content: 'USB Preferences'},
				{flex: 1}
			]},
			{flex: 1},
			{kind: 'Toolbar', width: '100%', className: 'enyo-toolbar-light', components: [
				{kind: 'GrabButton'}
			]},
		]},
		{name: "tcpPrefs", kind: "Pullout", height: '100%', width: '100%', className: "enyo-bg", flyInFrom: "right", components: [
			{kind: 'Toolbar', width: '100%', className: 'enyo-toolbar-light', components: [
				{flex: 1},
				{kind: 'Control', content: 'TCP/IP Preferences'},
				{flex: 1}
			]},
			{kind: 'RowGroup', components: [
        {kind: 'Input', value: '192.168.0.1', hint: '', components: [
        	{content: 'Gateway', className: 'ft-label'}
        ]},
        {kind: 'Input', value: '255.255.255.0', hint: '', components: [
        	{content: 'Subnet', className: 'ft-label'}
        ]},
        {kind: 'Input', value: '192.168.0.50', hint: '', components: [
        	{content: 'DHCP Start', className: 'ft-label'}
        ]},
        {kind: 'Input', value: '15', hint: '', components: [
        	{content: 'Max Leases', className: 'ft-label'}
        ]},
        {kind: 'Input', value: '7200', hint: '', components: [
        	{content: 'Lease Time', className: 'ft-label'}
        ]}
			]},
			{flex: 1},
			{kind: 'Toolbar', width: '100%', className: 'enyo-toolbar-light', components: [
				{kind: 'GrabButton'},
				{flex: 1},
				{content: 'Restore Defaults'}
			]},
		]}
	],

	initComponents: function() {
    this.inherited(arguments)
    enyo.setAllowedOrientation('up')
	},
	
	showPrefs: function(inSender, inEvent) {
		this.$[inSender.name+'Prefs'].open()
	}

})
