function HelpAssistant() {

};

HelpAssistant.prototype.setup = function() {

	this.controller.get('help-title').innerHTML = $L("Help");
	this.controller.get('help-support').innerHTML = $L("Support");
	
  this.controller.setupWidget(
    Mojo.Menu.appMenu,
    {
      omitDefaultItems: true
    },
    {
      visible: true,
      items: [
        {
          label: "Preferences",
          command: 'do-prefs'
        },
        {
          label: "Help",
          command: 'do-help'
        }
      ]
    }
  );
	
	this.controller.get('appname').innerHTML = Mojo.appInfo.title;
	this.controller.get('appdetails').innerHTML = Mojo.appInfo.version;
	
	this.supportModel = 
	{
		items: []
	};
	
	this.supportModel.items.push({
		text: $L("WebOS Internals Wiki"),
		detail: 'http://www.webos-internals.org/wiki/Application:FreeTether',
		Class: 'img_web',
		type: 'web'
	});
	this.supportModel.items.push({
		text: $L("Bug Reports"),
		detail: 'http://redmine.webos-internals.org/projects/freetether/issues',
		Class: 'img_web',
		type: 'web'
	});
	this.supportModel.items.push({
		text: $L('Changelog'),
		Class: 'img_changelog',
		type: 'changelog'
	});
	this.supportModel.items.push({
		text:'Send Email',
		address:'rmh3093+freetether@gmail.com',
		subject:'freeTether',
		Class:'img_email',
		type:'email'
	});
	
	this.controller.setupWidget
	(
		'supportList', 
		{
			itemTemplate: "help/rowTemplate",
			swipeToDelete: false,
			reorderable: false
		},
		this.supportModel
	);
	
	this.controller.listen('supportList', Mojo.Event.listTap, this.listTapHandler.bindAsEventListener(this));
	
};
HelpAssistant.prototype.listTapHandler = function(event)
{
	switch (event.item.type)
	{
		case 'web':
			this.controller.serviceRequest("palm://com.palm.applicationManager", 
			{
				method: "open",
				parameters: 
				{
					id: 'com.palm.app.browser',
					params: 
					{
						target: event.item.detail
					}
				}
			});
			break;
			
		case 'email':
			this.controller.serviceRequest('palm://com.palm.applicationManager', 
			{
				method: 'open',
				parameters: 
				{
					target: 'mailto:' + event.item.address + "?subject=" + Mojo.appInfo.title + " " + event.item.subject
				}
			});
			break;
			
		case 'changelog':
			this.controller.stageController.pushScene('startup', true);
			break;
			
		case 'scene':
			this.controller.stageController.pushScene(event.item.detail);
			break;
			
	}
};


HelpAssistant.prototype.handleCommand = function(event)
{
    if (event.type == Mojo.Event.command)
	{
	    switch (event.command)
		{
			case 'do-prefs':
				this.controller.stageController.pushScene('preferences-general');
				break;
								
			case 'do-help':
				this.controller.stageController.swapScene('help');
				break;		
		}
	}
};

HelpAssistant.prototype.activate = function(event) {};
HelpAssistant.prototype.deactivate = function(event) {};
HelpAssistant.prototype.cleanup = function(event)
{
	this.controller.stopListening('supportList', Mojo.Event.listTap, this.listTapHandler.bindAsEventListener(this));
};

// Local Variables:
// tab-width: 4
// End:
