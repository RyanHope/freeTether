function MainAssistant() {
	
	freeTetherD.getCarrier(this.getCarrierHandler.bindAsEventListener(this), false);
	
	this.networkInterfaceListModel = {
		items: []
	};
	
	this.networkInterfaceListElement = false;
	
}

MainAssistant.prototype.setup = function() {
	
	this.versionElement					= this.controller.get('version');
	this.versionElement.innerHTML		= "v" + Mojo.Controller.appInfo.version;
	
	this.viewOptions					= this.controller.get('viewOptions');
	this.viewOptions.style.display		= '';
	this.viewInterfaces					= this.controller.get('viewInterfaces');
	this.viewInterfaces.style.display	= 'none';
	this.viewRoutes						= this.controller.get('viewRoutes');
	this.viewRoutes.style.display		= 'none';
	
	this.networkInterfaceListElement	= this.controller.get('interfaceList');

	this.menuModel = {
		visible:true,
		items: [
			{},
			{label:$L('Views'), 
			toggleCmd:'viewOptions', 
			items:[
				{label:$L('Options'), command:'viewOptions'}, 
				{label:$L('Interfaces'), command:'viewInterfaces'},
				{label:$L('Routes'), command:'viewRoutes'},
			]},
			{},
		]
	};
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.menuModel);
	
	networkInterfaces.setListAssistant(this);

	this.updateInterfaceList(true);	
	this.controller.setupWidget(
		'interfaceList', 
		{
			itemTemplate: "main/interface-row",
			swipeToDelete: false,
			reorderable: false, 
		},
		this.networkInterfaceListModel
	);
	
}

MainAssistant.prototype.getCarrierHandler = function(payload) {

	carrier = payload.longName;
	this.updateInterfaceList(false);
		
}

MainAssistant.prototype.updateInterfaceList = function(skipUpdate)
{

	this.networkInterfaceListModel.items = [];
	this.networkInterfaceListModel.items = networkInterfaces.getListObjects();
	
	if (!skipUpdate) 
	{
		this.networkInterfaceListElement.mojo.noticeUpdatedItems(0, this.networkInterfaceListModel.items);
		this.networkInterfaceListElement.mojo.setLength(this.networkInterfaceListModel.items.length);
	}
		
}

MainAssistant.prototype.handleCommand = function(event) {
	
	if(event.type == Mojo.Event.command) {
		
		switch (event.command)
		{
			case 'viewOptions':
				this.viewOptions.style.display = '';
				this.viewInterfaces.style.display = 'none';
				this.viewRoutes.style.display = 'none';
				break;
			
			case 'viewInterfaces':
				this.viewInterfaces.style.display = '';
				this.viewOptions.style.display = 'none';
				this.viewRoutes.style.display = 'none';
				break;
				
			case 'viewRoutes':
				this.viewRoutes.style.display = '';
				this.viewInterfaces.style.display = 'none';
				this.viewOptions.style.display = 'none';
				break;
		}
			
	}
	
}

MainAssistant.prototype.activate = function(event) {
	
}

MainAssistant.prototype.deactivate = function(event) {
	
}

MainAssistant.prototype.cleanup = function(event) {
	
}
