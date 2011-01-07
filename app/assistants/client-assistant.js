function ClientAssistant(client) {
  this.client = client;
  this.clientInfoModel = {items:[], "listTitle": $L("Connected Device")};
  this.clientInfoItems = 
    [
      {title: $L("Name"), field: "name"},
      {title: $L("Type"), field: "type"},
      {title: $L("MAC Address"), field: "mac"},
      {title: $L("Assigned IP"), field: "ipv4"},
      //{title: $L("IP Lease Time"), field: "leaseTime"},
      //{title: $L("IP Lease Expiry"), field: "leaseExpiry"}
    ];
}

ClientAssistant.prototype.setup = function() {
  this.controller.setupWidget(
    'clientInfo',
    {
      multiline: true,
      multiLine: true,
      itemTemplate: 'client/client-item',
      listTemplate: 'client/client-container'
    },
    this.clientInfoModel);
    this.clientInfoModel.items.clear();

    var index = 0;
    for (var i=0; i<this.clientInfoItems.length; i++) {
      var item = this.clientInfoItems[i];
      if (item.field in this.client) {
        this.clientInfoModel.items[index] = 
          {
            field: item.field,
            title: item.title,
            data: this.client[item.field]
          };
        index++;
      }
    }

  this.controller.modelChanged(this.clientInfoModel);
}
