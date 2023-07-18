// ==UserScript==
// @name        BePro 2 Genesis!
// @namespace   https://genesis.beprotravel.com/
// @version     3.0.4
// @description This userscript send BePro Data to fill some order information in external systems
// @author      Misha Kav
// @copyright   2022, BePro Team
// @icon        https://genesis.beprotravel.com/favicon.ico
// @icon64      https://genesis.beprotravel.com/favicon.ico
// @homepage    https://genesis.beprotravel.com/
// @match       *://genesis.beprotravel.com/*
// @match       *.travelbooster.com/*
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @grant       GM_unregisterMenuCommand
// @run-at      document-end
// @updateURL   https://raw.githubusercontent.com/michael1g/P2D_Bepro/main/GenesisBepro.js
// @downloadURL https://raw.githubusercontent.com/michael1g/P2D_Bepro/main/GenesisBepro.js
// ==/UserScript==

/* global $, jQuery, NC */
(function () {
  'use strict';

  let _Order;
  let SourceUrl = "";
  let shouldSaveGlobal = true;

  const TIMEOUT = 420;

  const SUPPLIERS = {
    gogb: 'GO GLOBAL TRAVEL',
    ean1: 'EXPEDIA',
    ean2: 'EXPEDIA',
    ean7: 'EXPEDIA',
    ean8: 'EXPEDIA',
    hbed: 'EXPEDIA',
    hb5: 'HOTELBEDS',
    tboh: 'TBO HOLIDAYS EUROPE BV',
    trvc: 'TRAVCO',
    trv6: 'TRAVCO',
    airt: 'AIRTOUR',
    asa: 'ANGELA SHANLEY ASSOCIATES LTD',
    eutr: 'EUROTOURS INTERNATIONAL',
    hpro: 'HOTELSPRO',
    htsw: 'HOTUSA (RESTEL)',
    sunh: 'WEBBEDS FZ LLC',
    ostr: 'RATEHAWK',
    tdor: 'TELDAR',
    brst: 'BRAYSTON TRAVEL',
    grom: 'GET A ROOM',
  };

  const STATUSES = {
    OK: 'OK',
    RQ: 'Request',
    SO: 'SoldOut',
    XX: 'CancelledWithNoConfirm',
    CX: 'CancelledWithConfirm',
  };

  const PAX_TITLES = {
    'Mr.': { paxTitle: 'Mr.', paxValue: 'MR' },
    'Mrs.': { paxTitle: 'Mrs.', paxValue: 'MRS' },
    'Ms.': { paxTitle: 'Ms.', paxValue: 'MS' },
    'Miss.': { paxTitle: 'Miss.', paxValue: 'MISS' },
    'Dr.': { paxTitle: 'Dr.', paxValue: 'DR' },
    'Prof.': { paxTitle: 'Prof.', paxValue: 'PROF' },
    'Child': { paxTitle: 'Chd.', paxValue: 'CHD' },
  };

  // for local debug
  // @require      file:///Users/misha/Downloads/GithubSamples/userscripts/bepro-helper.user.js

  // ===== UTILS =====
  const sleep = (ms = TIMEOUT) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const isBeProSite = () => location.href.includes('beprotravel');
  const isTravelBoosterSite = () => location.href.includes('travelbooster');
  const isHotelDetailsPage = () =>
    location.href.includes('PaxFile/EditTransaction.aspx');
  const isPaxesDetailsPage = () =>
    location.href.includes('Customer/AddCustomer.aspx');
  const isEmptyObject = (obj) =>
    obj == null ||
    (obj && obj.constructor === Object && Object.keys(obj).length === 0);
  const isNotEmptyObject = (obj) => !isEmptyObject(obj);
  const formatDate = (dateStr, year4Digits = true) => {
    const date = new Date(dateStr);
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = year4Digits
      ? date.getFullYear()
      : date.getFullYear().toString().substring(2);

    return `${day}/${month}/${year}`;
  };


  const TARGET_URL = "https://b2e-genesis-out.travelbooster.com/UI_NET/Booking/PaxFile/Dashboard.aspx";
  function getQueryStringByName (name){
var url = SourceUrl;
    name = name.replace(/[\[\]]/g, '\\$&');

    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(url);
    if (!results) {
      return null;
    }

    if (!results[2]) {
      return '';
    }

    let res = decodeURIComponent(results[2].replace(/\+/g, ' '));
    return res;
  };
  // ===== UTILS =====

  init();

  function init() {
    initBeProSite();

    if (isTravelBoosterSite()) {
      loadOrderFromStorage();
      initTravelBooster();      
    }

    if (isNotEmptyObject(_Order)) {
      const { OrderSegId } = _Order;
    }
  }

   function initBeProSite() {
    if (isBeProSite() && $('#wid-id-myorders').length > 0) {
      // track change order on b2b
      $('#ActiveOrder').on('DOMSubtreeModified', () => {
        if (isNotEmptyObject(NC.Widgets.B2B.MyOrdersWidget._CurrentOrder)) {
          makeTravelBoosterUrl(NC.Widgets.B2B.MyOrdersWidget._CurrentOrder);
        }
      });
    }
  }

  function initTravelBooster() {
    addHotelButtons();
    addPaxesButtons();
  }

  function addHotelButtons() {
    if (isHotelDetailsPage() && (!jQuery || !jQuery().jquery)) {
      return;
    }

    const order = JSON.stringify(_Order, null, 2);


jQuery(`<button type='button'><a id="FillSaveDetails" href="#" style="text-decoration: none; color: #2c21d1;">Genesis</a></button>`).insertBefore(`[id*=frmTransact_btnCancel]`);
    jQuery('#FillDetails').click(fillHotelDetails);
    jQuery('#FillSaveDetails').click(() =>
      fillHotelDetails({ shouldSave: false })
    );
  }

  function addPaxesButtons() {
       loadOrderFromStorage();
    if (isPaxesDetailsPage() && (!jQuery || !jQuery().jquery)) {
      return;
    }


    const order = JSON.stringify(_Order.Paxes, null, 2);
      if (order) jQuery(`<p style="text-align: center; margin-bottom: 10px;"><a id="FillSavePaxes" href="#" style="text-decoration: none; color: #2c21d1;">Genesis P</a></p>`).insertAfter("#ctl00_MainContent_dfAddCustomer_CustomersList1_btnAddPax");
    jQuery('#FillPaxes').click(fillPaxesDetails);
    jQuery('#FillSavePaxes').click(() =>
      fillPaxesDetails({ shouldSave: true })
    );

  }

  async function fillPaxesDetails({ shouldSave = true }) {
    if (isTravelBoosterSite() && isNotEmptyObject(_Order)) {
      for (let i = 0; i < _Order.Paxes.length; i++) {
        if (i !== 0) {
           document.getElementById("ctl00_MainContent_dfAddCustomer_CustomersList1_btnAddPax").click();
          //jQuery('[id*=CustomersList1_btnAddPax]').click();
 await sleep(800);
        }

        const pax = _Order.Paxes[i];
        const row = jQuery('[id*=pnlCustomers] [divid=divCustomer]:last');
        const { paxTitle, paxValue } =
          PAX_TITLES[pax.PaxTitle] ?? PAX_TITLES['Mr.'];
        row.find('[id*=ddlTitle_tbAutoComplete').val(paxTitle);
        row.find('[id*=ddlTitle_hfAutoComplete').val(paxValue);

        row.find('[id*=tbLastName').val(pax.LastName);
 await sleep(50);
        row.find('[id*=tbFirstName').val(pax.FirstName);

        if (pax.DOB !== '1900-01-01T00:00:00') {
            var calendar = row.find('[id*=dsBirthDate_tbCalendar');
           // calendar.val(formatDate(pax.DOB, false));
           // calendar.get(0).dispatchEvent(new Event('focus'));
           // document.getElementById("ctl00_MainContent_dfAddCustomer_CustomersList1_rptCustomers_ctl02_dsBirthDate_hfDate").value='14/04/23';
           // calendar.get(0).dispatchEvent(new KeyboardEvent('keypress',{'key':'13'}));


            //row.find('[id*=dsBirthDate_tbCalendar').trigger("change");
            /*
            row.find('[id*=dsBirthDate_tbCalendar').trigger("focus");
            var e = jQuery.Event("keypress");
            e.which = 13; // Enter
            row.find('[id*=dsBirthDate_tbCalendar').trigger(e);
            */

        }

        row.find('[id*=tbEmail').val(pax.Email1);
        row.find('[id*=tbPhone').val(pax.Phone1 || pax.Mobile1);

       // row.find('[id*=ddlGender_TBText').val(pax.Gender);
       // row.find('[id*=ddlGender_TBValue').val(pax.Gender);

      }

      jQuery('#FillPaxes, #FillSavePaxes')
        .prop('disabled', true)
        .css('background-color', '#ddd')
        .css('pointer-events', 'none');

      if (shouldSaveGlobal) {
        jQuery('[id*=btnContinue').click();
      }
    }
  }


  function fillHotelDetails(options = {}) {
      loadOrderFromStorage();


    if (isTravelBoosterSite() && isNotEmptyObject(_Order)) {
    jQuery('[id*=cbResSupp_Widget]').trigger(jQuery.Event('click'));
    const { SysSuppCode } = _Order;
    const supplierText = SUPPLIERS[SysSuppCode] ? SUPPLIERS[SysSuppCode] : null;

    if (supplierText) {

        //wait until list is loaded
        var waitList = setInterval(() => {
            if (jQuery("a[title='"+supplierText+"']")){
                clearInterval(waitList);
                jQuery("a[title='"+supplierText+"']").click();

                        var waitList2 = setInterval(() => {
                          if (jQuery('[id*=tabControlMain_cbServiceProvider_tbAutoComplete]').val() != ''){
                              clearInterval(waitList2);
                                              setTimeout(() => {
                                                  jQuery('[id*=tabControlMain_txtDesc]').val(_Order.ItemDesc);
                                                  jQuery('[id*=cbAreas_tbAutoComplete]').val('Tel Aviv, TLV, Israel, ');
                                                  jQuery('[id*=cbAreas_hfAutoComplete]').val(4455); // Tel Aviv, TLV, Israel,

                                                  const { ItemAddress, SuppCityDesc, ItemZip, ItemPhone, ItemFax } = _Order;
                                                  jQuery('[id*=productAddress_tbAddress]').val(ItemAddress);
                                                  jQuery('[id*=productAddress_tbCity]').val(SuppCityDesc);
                                                  jQuery('[id*=productAddress_tbZip]').val(ItemZip);
                                                  jQuery('[id*=G2DataForm1_txtPhone1]').val(ItemPhone);
                                                  jQuery('[id*=tabControlMain_txtFax]').val(ItemFax);

                                                  fillReservation();
                                                  fillDates();
                                                  setTimeout(() => {
                                                      showPricingTab(options);
                                                  }, 3000);
                                              }, 1000);
                          }
                        }, 500);
            }
         }, 500);
    }

    }
  }

  function showPricingTab(options = {}) {
    jQuery('[id*=tabPassengers_A]').trigger(jQuery.Event('click'));
      /*
      setTimeout(() => {
           jQuery('[id*=frmTransact_ddlCurrency_Widget]').trigger(jQuery.Event('click'));
           setTimeout(() => {
               jQuery("div:contains('EUR-')").trigger(jQuery.Event('click'));
           }, 500);
        }, 1000);
*/

                        setTimeout(() => {
                             addCurrency(options);
                        }, 1000);
     



  }

  function addCurrency(options = {}) {
    const { SysCurrencyCode = 'USD' } = _Order;
       jQuery('[id*=editCustomers_frmTransact_ddlCurrency_Widget]').click()
        setTimeout(() => {
            jQuery("a[title^='"+SysCurrencyCode+"']").click();

          jQuery('[id*=dlCustomers_ctl01_chkSelected]')
          .prop('checked', true)
          .trigger(jQuery.Event('change'));

               setTimeout(() => {
                   addPrice(options);
               }, 1000);
        }, 1000);

/*
    jQuery('[id*=editCustomers_frmTransact_ddlCurrency]')
      .val(SysCurrencyCode)
      .trigger(jQuery.Event('change'));
*/
  


  }

  function addPrice({ shouldSave }) {
    const { SysTotalGross, SysTotalGross2, OrderSegId } = _Order;
 jQuery('[id*=ctl01_txtSuppPrice]')
      .val(SysTotalGross)
      .trigger(jQuery.Event('change'));
        setTimeout(() => {
             jQuery('[id*=ctl01_txtSellPrice]')
                 .val(SysTotalGross2)
                 .trigger(jQuery.Event('change'));

            jQuery('[id*=ctl01_txtNet]')
                .val(SysTotalGross)
                .trigger(jQuery.Event('change'));

            jQuery('[id*=ctl01_txtSellPrice]')
                .val(SysTotalGross2)
                .trigger(jQuery.Event('change'));

               setTimeout(() => {
                       if (shouldSaveGlobal) {
                           jQuery('[id*=frmTransact_btnContinue').click();
                       }
               }, 2000);
        }, 2000);



  }

   function fillReservation() {
    const { OrderSegId, SuppPnr } = _Order;

    fillStatus();
    sleep(300);
    jQuery('[id*=tabControlMain_txtConfWidth]').val(`BePro: ${OrderSegId}`);
    sleep(300);
    jQuery('[id*=G2DataForm4_txtReservation]').val(SuppPnr);
  }

  function fillStatus() {
    const { RoomsStatusCode } = _Order;
    const statusValue = STATUSES[RoomsStatusCode]
      ? STATUSES[RoomsStatusCode]
      : 'None';

    jQuery('[id*=G2DataForm4_ddlStatus]').val(statusValue);
  }

 function fillDates() {
    const { CheckIn, CheckOut } = _Order;
    const checkInString = formatDate(CheckIn);
    const checkOutString = formatDate(CheckOut);

    jQuery('[id*=frmDates_dsStartDate_tbCalendar]')
      .val(checkInString)
      .trigger('change');
    jQuery('[id*=rmDates_dsEndDate_tbCalendar]')
      .val(checkOutString)
      .trigger('change');

     jQuery('[id*=frmDates_dsStartDate_hfDate]')
      .val(checkInString);

     jQuery('[id*=frmDates_dsEndDate_hfDate]')
      .val(checkOutString);
  }


 function makeTravelBoosterUrl(_OrderFromB2B) {
    if (isNotEmptyObject(_OrderFromB2B)) {
      const [segment] = _OrderFromB2B.Order.Segments;
      const isHotel = segment.ProductType === 'HTL';
      const {
        OrderSegId,
        SuppPnr,
        ItemDesc,
        ItemStarRateCode,
        RoomsStatusCode,
        CheckIn,
        CheckOut,
        RoomsFirstCXL,
        SysTotalGross,
        SysTotalGross2,
        SysSuppCode,
        Rooms,
        SysCurrencyCode,
        NumberOfNights,
        ItemAddress,
        SuppCityDesc,
        ItemPhone,
        ItemFax,
        ItemZip,
      } = segment;
      const Paxes = _OrderFromB2B.Order.Paxes.map((p) => ({
        Country: p.Country,
        DOB: p.DOB,
        FirstName: p.FirstName,
        LastName: p.LastName,
        Gender: p.Gender,
        PaxTitle: p.PaxTitle,
        Mobile1: p.Mobile1,
        Phone1: p.Phone1,
        Email1: p.Email1,
      }));
      const miniOrder = {
        OrderSegId,
        SuppPnr,
        ItemDesc: ItemDesc.replace(/'/g,""),
        ItemStarRateCode,
        RoomsStatusCode,
        CheckIn,
        CheckOut,
        RoomsFirstCXL,
        SysTotalGross,
        SysTotalGross2,
        SysSuppCode,
        SysBasisCode: isHotel && Rooms[0].SysBasisCode,
        SysCurrencyCode,
        NumberOfNights,
        ItemAddress: ItemAddress.replace(/'/g,""),
        SuppCityDesc: SuppCityDesc.replace(/'/g,""),
        ItemPhone,
        ItemFax,
        ItemZip,
        Paxes,
      };

      const isSupportedSupplier = SUPPLIERS[SysSuppCode] != null;
      const disabled = isHotel && isSupportedSupplier ? '' : 'disabled';

      $('#TravelBoosterUrl').remove();
      $('#wid-id-myorders header span:first').after(
        `<a id='TravelBoosterUrl'
        class='btn btn-xs btn-danger margin-top-5 margin-top-5 ${disabled}'
        href='#'>
          Travel Booster #${_OrderFromB2B.OrderRow.SegmentId}
         </a>`
      );

        var myEl = document.getElementById('TravelBoosterUrl');
        myEl.addEventListener('click', function() {
            GM_setValue('Order', '');
            if (miniOrder){
                GM_setValue('Order', JSON.stringify(miniOrder));
                window.open(`${TARGET_URL}`);
            }
        }, false);
    }
    // NC.Widgets.B2B.Utils.SmallWarningBox('Please, Select the Order first');
  }

  function loadOrderFromStorage() {
    let order = GM_getValue('Order');
    //  const order = localStorage.getItem("Order");
    if (isNotEmptyObject(order)) {
      _Order = JSON.parse(order);

    }
  }
})();
