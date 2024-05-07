sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  function (
    BaseController,
    JSONModel,
    formatter,
    Filter,
    FilterOperator,
    MessageToast,
    MessageBox
  ) {
    "use strict";

    return BaseController.extend("fiorifreestylewizardv1.controller.Worklist", {
      formatter: formatter,

      /* =========================================================== */
      /* lifecycle methods                                           */
      /* =========================================================== */

      /**
       * Called when the worklist controller is instantiated.
       * @public
       */
      onInit: function () {
        var oViewModel;

        // keeps the search state
        this._aTableSearchState = [];

        // Model used to manipulate control states
        oViewModel = new JSONModel({
          worklistTableTitle:
            this.getResourceBundle().getText("worklistTableTitle"),
          shareSendEmailSubject: this.getResourceBundle().getText(
            "shareSendEmailWorklistSubject"
          ),
          shareSendEmailMessage: this.getResourceBundle().getText(
            "shareSendEmailWorklistMessage",
            [location.href]
          ),
          tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
        });
        this.setModel(oViewModel, "worklistView");

        // WIZARD
        this._wizard = this.byId("CreateProductWizard");
        this._oNavContainer = this.byId("wizardNavContainer");
        this._oWizardContentPage = this.byId("wizardContentPage");

        this.model = new JSONModel();
        this.model.setData({
          productNameState: "Error",
          productWeightState: "Error",
          loteInput1State: "Error",
          loteInput2State: "Error",
        });
        // this.getView().setModel(this.model);
        this.model.setProperty("/productType", "Mobile");
        this.model.setProperty("/availabilityType", "In Store");
        this.model.setProperty("/navApiEnabled", true);
        this.model.setProperty("/productVAT", false);
        this.model.setProperty("/measurement", "");
        this.model.setProperty("/loteInput1", "");
        this.model.setProperty("/loteInput2", "");
        this.model.setProperty("/loteInput2Visible", false);

        this._setEmptyValue("/productManufacturer");
        this._setEmptyValue("/productDescription");
        this._setEmptyValue("/size");
        this._setEmptyValue("/productPrice");
        this._setEmptyValue("/manufacturingDate");
        this._setEmptyValue("/discountGroup");
      },

      /* =========================================================== */
      /* event handlers                                              */
      /* =========================================================== */

      /**
       * Triggered by the table's 'updateFinished' event: after new table
       * data is available, this handler method updates the table counter.
       * This should only happen if the update was successful, which is
       * why this handler is attached to 'updateFinished' and not to the
       * table's list binding's 'dataReceived' method.
       * @param {sap.ui.base.Event} oEvent the update finished event
       * @public
       */
      onUpdateFinished: function (oEvent) {
        // update the worklist's object counter after the table update
        var sTitle,
          oTable = oEvent.getSource(),
          iTotalItems = oEvent.getParameter("total");
        // only update the counter if the length is final and
        // the table is not empty
        if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
          sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [
            iTotalItems,
          ]);
        } else {
          sTitle = this.getResourceBundle().getText("worklistTableTitle");
        }
        this.getModel("worklistView").setProperty(
          "/worklistTableTitle",
          sTitle
        );
      },

      /**
       * Event handler when a table item gets pressed
       * @param {sap.ui.base.Event} oEvent the table selectionChange event
       * @public
       */
      onPress: function (oEvent) {
        // The source is the list item that got pressed
        this._showObject(oEvent.getSource());
      },

      /**
       * Event handler for navigating back.
       * Navigate back in the browser history
       * @public
       */
      onNavBack: function () {
        // eslint-disable-next-line fiori-custom/sap-no-history-manipulation, fiori-custom/sap-browser-api-warning
        history.go(-1);
      },

      onSearch: function (oEvent) {
        if (oEvent.getParameters().refreshButtonPressed) {
          // Search field's 'refresh' button has been pressed.
          // This is visible if you select any main list item.
          // In this case no new search is triggered, we only
          // refresh the list binding.
          this.onRefresh();
        } else {
          var aTableSearchState = [];
          var sQuery = oEvent.getParameter("query");

          if (sQuery && sQuery.length > 0) {
            aTableSearchState = [
              new Filter("Ebeln1", FilterOperator.Contains, sQuery),
            ];
          }
          this._applySearch(aTableSearchState);
        }
      },

      /**
       * Event handler for refresh event. Keeps filter, sort
       * and group settings and refreshes the list binding.
       * @public
       */
      onRefresh: function () {
        var oTable = this.byId("table");
        oTable.getBinding("items").refresh();
      },

      /* =========================================================== */
      /* internal methods                                            */
      /* =========================================================== */

      /**
       * Shows the selected item on the object page
       * @param {sap.m.ObjectListItem} oItem selected Item
       * @private
       */
      _showObject: function (oItem) {
        this.getRouter().navTo("object", {
          objectId: oItem
            .getBindingContext()
            .getPath()
            .substring("/PedidoSet".length),
        });
      },

      /**
       * Internal helper method to apply both filter and search state together on the list binding
       * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
       * @private
       */
      _applySearch: function (aTableSearchState) {
        var oTable = this.byId("table"),
          oViewModel = this.getModel("worklistView");
        oTable.getBinding("items").filter(aTableSearchState, "Application");
        // changes the noDataText of the list in case there are no filter results
        if (aTableSearchState.length !== 0) {
          oViewModel.setProperty(
            "/tableNoDataText",
            this.getResourceBundle().getText("worklistNoDataWithSearchText")
          );
        }
      },

      //----------------------------------------------------------------
      // WIZARD
      //----------------------------------------------------------------

      setProductType: function (evt) {
        var productType = evt.getSource().getTitle();
        this.model.setProperty("/productType", productType);
        this.byId("ProductStepChosenType").setText(
          "Chosen product type: " + productType
        );
        this._wizard.validateStep(this.byId("ProductTypeStep"));
      },

      setProductTypeFromSegmented: function (evt) {
        var productType = evt.getParameters().item.getText();
        this.model.setProperty("/productType", productType);
        this._wizard.validateStep(this.byId("ProductTypeStep"));
      },

      additionalInfoValidation: function () {
        let loteInput2Visible = this.model.getProperty("/loteInput2Visible");

        let loteInput1 = this.byId("LoteInput1").getValue();
        if (loteInput1.length == 10) {
          this.model.setProperty("/loteInput1State", "None");
          // alert("Lote correto 10 dígitos!");
        //   if (!loteInput2Visible) {
        //     let loteInput2VisibleX = prompt("Mostrar Lote 2 = X", "X");
        //     if (loteInput2VisibleX) {
        //       this.model.setProperty("/loteInput2Visible", true);
        //     }
        //   }

          this.get1();
        } else {
          this.model.setProperty("/loteInput1State", "Error");
        }

        let loteInput2 = this.byId("LoteInput2").getValue();
        if (loteInput2.length == 10) {
          this.model.setProperty("/loteInput2State", "None");
        } else {
          this.model.setProperty("/loteInput2State", "Error");
        }

        // var name = this.byId("ProductName").getValue();
        // var weight = parseInt(this.byId("ProductWeight").getValue());

        // if (isNaN(weight)) {
        // 	this._wizard.setCurrentStep(this.byId("ProductInfoStep"));
        // 	this.model.setProperty("/productWeightState", "Error");
        // } else {
        // 	this.model.setProperty("/productWeightState", "None");
        // }

        // if (name.length < 6) {
        // 	this._wizard.setCurrentStep(this.byId("ProductInfoStep"));
        // 	this.model.setProperty("/productNameState", "Error");
        // } else {
        // 	this.model.setProperty("/productNameState", "None");
        // }

        // if (name.length < 6 || isNaN(weight)) {
        // 	this._wizard.invalidateStep(this.byId("ProductInfoStep"));
        // } else {
        // 	this._wizard.validateStep(this.byId("ProductInfoStep"));
        // }
      },

      get1: function () {
		// teste read 0
        let sDataPath = "/sap/opu/odata/sap/Z270FREEWIZARD01_SRV";
		let sPedido = "/PedidoSet(Ebeln1='" + "4500000001" + "')"
        let sServiceUrl = sDataPath + sPedido;
        let oModel = new sap.ui.model.odata.v2.ODataModel(sDataPath);
		debugger;
        oModel.read(sPedido, {
          success: function (oData, oResponse) {
            debugger;
          }.bind(this),
          error: function (oError) {
            debugger;
          }.bind(this),
        });

		// teste read 1
        let sDataPath1 = "http://lnl-s4h.opustech.com.br:8000/sap/opu/odata/sap/Z270FREEWIZARD01_SRV";
		let sPedido1 = "/PedidoSet(Ebeln1='" + "4500000002" + "')"
        let sServiceUrl1 = sDataPath1 + sPedido1;
        let oModel1 = new sap.ui.model.odata.v2.ODataModel(sDataPath1);
		debugger;
        oModel1.read(sPedido1, {
          success: function (oData, oResponse) {
            debugger;
          }.bind(this),
          error: function (oError) {
            debugger;
          }.bind(this),
        });

		// teste read 2
        // let oModel2 = this.getView().getModel();
		let oModel2 = this.getOwnerComponent().getModel();
		debugger;
		// oModel2 = this.getModel();
        // let sPath = "/PedidoSet(Ebeln1='" + "4500000000" + "')";
		let sPath = "/PedidoSet('" + "4500000003" + "')";
		// debugger;
        // oModel2.read(sPath, {
		oModel2.read("/PedidoSet('4500000003')", {
			success: function (oData, oResponse) {
				debugger;
			}.bind(this),
			error: function (oError) {
				debugger;
			}.bind(this)
		});
        
      },

      optionalStepActivation: function () {
        MessageToast.show("This event is fired on activate of Step3.");
      },

      optionalStepCompletion: function () {
        MessageToast.show(
          "This event is fired on complete of Step3. You can use it to gather the information, and lock the input data."
        );
      },

      pricingActivate: function () {
        this.model.setProperty("/navApiEnabled", true);
      },

      pricingComplete: function () {
        this.model.setProperty("/navApiEnabled", false);
      },

      scrollFrom4to2: function () {
        this._wizard.goToStep(this.byId("ProductInfoStep"));
      },

      goFrom4to3: function () {
        if (this._wizard.getProgressStep() === this.byId("PricingStep")) {
          this._wizard.previousStep();
        }
      },

      goFrom4to5: function () {
        if (this._wizard.getProgressStep() === this.byId("PricingStep")) {
          this._wizard.nextStep();
        }
      },

      wizardCompletedHandler: function () {
        this._oNavContainer.to(this.byId("wizardReviewPage"));
      },

      backToWizardContent: function () {
        this._oNavContainer.backToPage(this._oWizardContentPage.getId());
      },

      editStepOne: function () {
        this._handleNavigationToStep(0);
      },

      editStepTwo: function () {
        this._handleNavigationToStep(1);
      },

      editStepThree: function () {
        this._handleNavigationToStep(2);
      },

      editStepFour: function () {
        this._handleNavigationToStep(3);
      },

      _handleNavigationToStep: function (iStepNumber) {
        var fnAfterNavigate = function () {
          this._wizard.goToStep(this._wizard.getSteps()[iStepNumber]);
          this._oNavContainer.detachAfterNavigate(fnAfterNavigate);
        }.bind(this);

        this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
        this.backToWizardContent();
      },

      _handleMessageBoxOpen: function (sMessage, sMessageBoxType) {
        MessageBox[sMessageBoxType](sMessage, {
          actions: [MessageBox.Action.YES, MessageBox.Action.NO],
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.YES) {
              this._handleNavigationToStep(0);
              this._wizard.discardProgress(this._wizard.getSteps()[0]);
            }
          }.bind(this),
        });
      },

      _setEmptyValue: function (sPath) {
        this.model.setProperty(sPath, "n/a");
      },

      handleWizardCancel: function () {
        this._handleMessageBoxOpen(
          "Are you sure you want to cancel your report?",
          "warning"
        );
      },

      handleWizardSubmit: function () {
        this._handleMessageBoxOpen(
          "Are you sure you want to submit your report?",
          "confirm"
        );
      },

      productWeighStateFormatter: function (val) {
        return isNaN(val) ? "Error" : "None";
      },

      discardProgress: function () {
        this._wizard.discardProgress(this.byId("ProductTypeStep"));

        var clearContent = function (content) {
          for (var i = 0; i < content.length; i++) {
            if (content[i].setValue) {
              content[i].setValue("");
            }

            if (content[i].getContent) {
              clearContent(content[i].getContent());
            }
          }
        };

        this.model.setProperty("/productWeightState", "Error");
        this.model.setProperty("/productNameState", "Error");
        clearContent(this._wizard.getSteps());
      },
    });
  }
);
