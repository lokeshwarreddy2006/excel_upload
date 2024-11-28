sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/pimd/excelupload/util/XLSX",
    "com/pimd/excelupload/util/JsZip",
    "com/pimd/excelupload/util/FullMin",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
],
function (Controller,XLSXFile,JsZip,FullMin,MessageBox,JSONModel,Fragment) {
    "use strict";

    return Controller.extend("com.pimd.excelupload.controller.View1", {
        onInit: function () {
            var oModel = this.getOwnerComponent().getModel();
            this.oDataModel = new sap.ui.model.odata.ODataModel(oModel.sServiceUrl)
            /*this.oDataModel = new sap.ui.model.odata.ODataModel(oModel.sServiceUrl, {
                    json: true,
                    useBatch: true
                });*/
        },
        // upload file
        onUpload: function (oEvent) {
            this.getView().byId("idSmartTable").setBusy(true);
           // sap.ui.core.BusyIndicator.show(-1);
            this._import(oEvent.getParameter("files") && oEvent.getParameter("files")[0]);
        },
        // arrange imported data into import holiday table
        _import: function (file) {
            var that = this;
            var excelData = {};
            if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var data = e.target.result;
                    var workbook = XLSX.read(data, {
                        type: 'binary'
                    });
                    workbook.SheetNames.forEach(function (sheetName) {
                        // Here is your object for every sheet in workbook
                        excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                    });
                    that.PostExcelData(excelData);
                };
                reader.onerror = function (ex) {
                    MessageBox.error(ex);
                };
                reader.readAsBinaryString(file);
            }
        },
        PostExcelData:function(data){
           // var oModel = this.getOwnerComponent().getModel();
            //this.oDataModel = new sap.ui.model.odata.ODataModel(oModel.sServiceUrl);
            var aBatchArray = [];
            for(var i=0;i<data.length;i++){
                var oBatchOperation = this.oDataModel.createBatchOperation("/ServiceMasterSet", "POST", data[i]);
                    aBatchArray.push(oBatchOperation);
            }
            this.oDataModel.addBatchChangeOperations(aBatchArray);
            this.oDataModel.submitBatch(function (oResult) {
                this.getView().byId("idSmartTable").setBusy(false);
                try {
                    if (oResult.__batchResponses[0].__changeResponses[0].statusCode == '201' || oResult.__batchResponses[0].__changeResponses[0].statusCode == '200') {
                        MessageBox.success("Records posted successfully");
                        }
                } catch (err) { }
                try {
                    if (oResult.__batchResponses[0].response.statusCode == '502' || oResult.__batchResponses[0].response.statusCode == '500' || oResult.__batchResponses[0].response.statusCode == '400' || oResult.__batchResponses[0].response.statusCode == '405') {
                        //MessageBox.error(oResult.__batchResponses[0].response.statusText);
                        try{
                            var errRes =  this.xmlToJson(oResult.__batchResponses[0].response.body);
                            MessageBox.error(errRes.error.message);
                        }catch(err){MessageBox.error(oResult.__batchResponses[0].response.statusText);}
                    }
                } catch (err) { }
            }.bind(this), function (oError) {
                MessageBox.error("Batch error");
                this.getView().byId("idSmartTable").setBusy(false);
            }.bind(this));
            
        },
        onDeleteRow:function(){
            this.getView().byId("idSmartTable").setBusy(true);
            var oSelectedItems = this.getView().byId("TableId").getSelectedItems();
            //var oModel = this.getOwnerComponent().getModel();
            //var oDataModel = new sap.ui.model.odata.ODataModel(oModel.sServiceUrl);
            var aBatchArray = [];
            for(var i=0;i<oSelectedItems.length;i++){
                var oPayload = oSelectedItems[i].getBindingContext().getObject();
                //(ServCategory='EDP',SubCategory='954000',Class='PIARMC00082',UnspscCode='71121901',IsicCode='M712')
                var oBatchOperation = this.oDataModel.createBatchOperation("/ServiceMasterSet(ServCategory='"+oPayload.ServCategory+"',SubCategory='"+oPayload.SubCategory+"',Class='"+oPayload.Class+"',UnspscCode='"+oPayload.UnspscCode+"',IsicCode='"+oPayload.IsicCode+"')", "DELETE");
                    aBatchArray.push(oBatchOperation);
            }
            this.oDataModel.addBatchChangeOperations(aBatchArray);
            this.oDataModel.submitBatch(function (oResult) {
                this.getView().byId("idSmartTable").setBusy(false);
                try {
                    if (oResult.__batchResponses[0].__changeResponses[0].statusCode == '204' || oResult.__batchResponses[0].__changeResponses[0].statusCode == '200') {
                        MessageBox.success("Record deleted successfully");
                        this.getView().byId("TableId").removeSelections();
                        this.getView().byId("idSmartTable").getModel().refresh();
                        }
                } catch (err) { }
                try {
                    if (oResult.__batchResponses[0].response.statusCode == '502' || oResult.__batchResponses[0].response.statusCode == '500' || oResult.__batchResponses[0].response.statusCode == '400' || oResult.__batchResponses[0].response.statusCode == '405') {
                        try{
                            var errRes = this.xmlToJson(oResult.__batchResponses[0].response.body)
                            MessageBox.error(errRes.error.message);
                        }catch(err){MessageBox.error(oResult.__batchResponses[0].response.statusText);}
                    }
                } catch (err) { }
            }.bind(this), function (oError) {
                MessageBox.error("Batch error");
                this.getView().byId("idSmartTable").setBusy(false);
            }.bind(this));
        },
        onSelectionChange:function(oEvent){
           // var oSelectedItems = oEvent.getSource().getSelectedItem().getBindingContext().getObject()
           var oSelectedItems = this.getView().byId("TableId").getSelectedItems();
           if(oSelectedItems.length > 0 ){
                this.getView().byId("idDelete").setEnabled(true);
           }else{
            this.getView().byId("idDelete").setEnabled(false);
           }
        },
        onCreatePress: function( ){
            var oModel = new JSONModel();
            oModel.setProperty("/ServCategory","");
            oModel.setProperty("/SubCategory","");
            oModel.setProperty("/Class","");
            oModel.setProperty("/UnspscCode","");
            oModel.setProperty("/IsicCode","");
            this.getView().setModel(oModel,"HomeModel");
            
            if (!this.oCreateDialog) {
                this.oCreateDialog = Fragment.load({
                    name: "com.pimd.excelupload.fragment.Createsrvt",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            this.oCreateDialog.then(function (oDialog) {
                oDialog.open();
            }.bind(this));
            
        },
        onCancel: function (){
            this.oCreateDialog.then(function (oDialog) {
                oDialog.close();
            }.bind(this));
        },
        onSaveRequest: function () {
			var oHomeModel = this.getView().getModel("HomeModel").getData();
			var postData = {};
			postData.ServCategory = oHomeModel.ServCategory;
			postData.SubCategory = oHomeModel.SubCategory;
			postData.Class = oHomeModel.Class;
			postData.UnspscCode = oHomeModel.UnspscCode;
            postData.IsicCode = oHomeModel.IsicCode;
            if(postData.ServCategory=="" || postData.SubCategory=="" || postData.Class=="" ||
                postData.UnspscCode=="" || postData.IsicCode=="" )
             {
                MessageBox.error("Enter Mandatory Fields");
                return;
            }
           // var oModel = this.getOwnerComponent().getModel();
           // var oDataModel = new sap.ui.model.odata.ODataModel(oModel.sServiceUrl);
           this.oDataModel.create("ServiceMasterSet", postData, null, function (oData, response) {
                this.onCancel();
				MessageBox.success("Succesfully Created");
			}.bind(this), function (error) {
				MessageBox.error("Invalid Record")
			}, true);
		},

        xmlToJson: function(xml) {
            function parse(node, j) {
              var nodeName = node.nodeName.replace(/^.+:/, '').toLowerCase();
              var cur = null;
              var text = $(node).contents().filter(function(x) {
                return this.nodeType === 3;
              });
              if (text[0] && text[0].nodeValue.trim()) {
                cur = text[0].nodeValue;
              } else {
                cur = {};
                $.each(node.attributes, function() {
                  if (this.name.indexOf('xmlns:') !== 0) {
                    cur[this.name.replace(/^.+:/, '')] = this.value;
                  }
                });
                $.each(node.children, function() {
                  parse(this, cur);
                });
              }
              
              j[nodeName] = cur;
            }
           
            var roots = $(xml);
            var root = roots[roots.length-1];
            var json = {};
            parse(root, json);
            return json;
          },
         /* handleSuggestServiceCatg:function(oEvent) {
            var sTerm = oEvent.getParameter("suggestValue");
            var aFilters = [];
            if (sTerm) {
                aFilters.push(new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.StartsWith, sTerm));
            }
            oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
        }*/
    });
});
