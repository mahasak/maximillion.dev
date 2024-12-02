import { debug, genChannelData, sendButtonTemplate, sendGenericTemplate, sendTextMessage } from "@maximillion/shared";
import type { ChangesEvent, MessagingEvent } from "@maximillion/shared/types";


export const triggerConfirmationFlow = async (page_id: string, psid: string, media_id: string) => {
  try {
    const pageConfig = await genChannelData("FACEBOOK_PAGE", page_id);
    if (pageConfig && pageConfig.token && pageConfig.token !== "") {
      const res = await fetch(`https://graph.facebook.com/v14.0/${page_id}/invoice_access_bank_slip_confirmation_flow/?access_token=${pageConfig.token}`, {
        method: 'POST',
        body: JSON.stringify({
          media_id: media_id,
          buyer_id: psid
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data: any = await res.json()
      console.log(data);
    }
    
  } catch (error) {
    console.log(error);
  }
}

export const getPaymentList = async (page_id: string, psid: string) => {
  try {
    const pageConfig = await genChannelData("FACEBOOK_PAGE", page_id);
    console.log(pageConfig)
    if (pageConfig && pageConfig.token && pageConfig.token !== "") {
      const res = await fetch(`https://graph.facebook.com/v14.0/${page_id}/invoice_access_payments?limit=15&buyer_psids=[${psid}]&access_token=${pageConfig.token}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }

      })

      const data: any = await res.json()
      console.log(data);
      const receiverID = data.data[0].payments[0].buyer_id

      let elements = []
      for (let i = 0; i < data.data[0].payments.length; i++) {
        const obj = data.data[0].payments[i]
        const item = {
          title: `Payment ID: ${obj.payment_id}`,
          image_url: obj.metadata.bank_slip.image_url,
          subtitle: `${obj.payment_amount.amount} ${obj.payment_amount.currency} (${obj.metadata.bank_slip.validation_status})`,
          default_action: {
            type: "web_url",
            url: obj.metadata.bank_slip.image_url,
            messenger_extensions: false,
            webview_height_ratio: "FULL"
          },
          buttons: [{
            type: "web_url",
            url: obj.metadata.bank_slip.image_url,
            title: "View Bankslip"
          }, {
            type: "postback",
            title: "Details",
            payload: `BANK_SLIP_DETAIL:${obj.payment_id}`
          }]
        }
        elements.push(item)
      }

      sendGenericTemplate(page_id, psid, elements)
    }

  } catch (error) {
    console.log(error)
  }
}

export const getPaymentDetail = async (page_id: string, psid: string, payment_id: string) => {
  try {
    const pageConfig = await genChannelData("FACEBOOK_PAGE", page_id);
    if (pageConfig && pageConfig.token && pageConfig.token !== "") {
      console.log(payment_id)
      const res = await fetch(`https://graph.facebook.com/v14.0/${page_id}/invoice_access_payments/?payment_id=${payment_id}&access_token=${pageConfig.token}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }

      })
      const data: any = await res.json()

      const obj = data.data[0].payments[0]
      const item = {
        title: `Payment ID: ${obj.payment_id}`,
        image_url: obj.metadata.bank_slip.image_url,
        subtitle: `${obj.payment_amount.amount} ${obj.payment_amount.currency} (${obj.metadata.bank_slip.validation_status})`,
        default_action: {
          type: "web_url",
          url: obj.metadata.bank_slip.image_url,
          messenger_extensions: false,
          webview_height_ratio: "FULL"
        },
        buttons: [{
          type: "web_url",
          url: obj.metadata.bank_slip.image_url,
          title: "View Bankslip"
        }, {
          type: "postback",
          title: "Details",
          payload: `BANK_SLIP_DETAIL:${obj.payment_id}`
        }]
      }

      sendGenericTemplate(page_id, psid, [item])
      debug('INVOICE DETAIL', data)
    }
  } catch (error) {
    console.log(error);
  }
}

export const bankslipDetectionMessageHook = async (event: MessagingEvent) => {
  const senderID = event.sender.id
  const recipientID = event.recipient.id
  const message = event.message

  if (message?.text?.toString().startsWith("#payment")) {
    await getPaymentList(recipientID, senderID)
  }

  if (message?.text?.toString().startsWith("#help")) {
    await getPaymentList(recipientID, senderID)
  }
}

export const bankslipDetectionPostbackHook = async (event: MessagingEvent) => {
  const senderID = event.sender.id
  const recipientID = event.recipient.id
  const postback = event.postback

  if (postback?.payload.startsWith('BANK_SLIP_DETAIL:')) {
    const [keyword, payment_id] = postback.payload.toString().split(':')
    if (payment_id !== undefined && keyword == 'BANK_SLIP_DETAIL') {
      await getPaymentDetail(recipientID, senderID, payment_id)
    }
  }

  if (postback?.payload.startsWith('YES_RETRY_CONFIRMATION:')) {
    const [keyword, payment_id] = postback.payload.toString().split(':')
    await sendTextMessage(recipientID, senderID, `Triggering confimation flow for ${payment_id}`)
    await triggerConfirmationFlow(recipientID, senderID, payment_id)
  }

  if (postback?.payload === 'NO_RETRY_CONFIRMATION') {
    await sendTextMessage(recipientID, senderID, "Thankyou we valued your opinions. Good day !")
  }
}

export const bankslipDetectionQuickReplyHook = async (event: MessagingEvent) => {
  const senderID = event.sender.id
  const recipientID = event.recipient.id
  const quickReplyPayload = event.message?.quick_reply?.payload

  if (quickReplyPayload?.startsWith('YES_RETRY_CONFIRMATION:')) {
    const [_keyword, payment_id] = quickReplyPayload.toString().split(':')
    await sendTextMessage(recipientID, senderID, `Triggering confimation flow for ${payment_id}`)
    await triggerConfirmationFlow(recipientID, senderID, payment_id)
  }

  if (quickReplyPayload === 'NO_RETRY_CONFIRMATION') {
    await sendTextMessage(recipientID, senderID, "Thankyou we valued your opinions. Good day !")
  }
}

export const bankslipDetectionChangesHook = async (change: ChangesEvent) => {
  if (change.value.event === 'bank_slip_detected') {
    debug('BANK SLIP DETECTED', change)

    const message = "We seen bank slip with following data:\n\n" +
      "⏱️ Time: " + change.value.timestamp + "\n" +
      "🖼️ Media ID: " + change.value.media_id + "\n" +
      "💸 Buyer ID: " + change.value.buyer_id + "\n" +
      "📄 Page ID: " + change.value.page_id + "\n" +
      "📁 Event: " + change.value.event + "\n"

    await sendTextMessage(change.value.page_id, change.value.buyer_id, message)
  }

  if (change.value.event === 'consent_accepted') {
    debug('CONSENT ACCEPTED', change)
    debug('CONSENT ACCEPTED DETAIL', change.value.payment.metadata)

    const item = {
      title: `Thanks for confirming Payment ID: ${change.value.payment.payment_id}`,
      image_url: change.value.payment.metadata.bank_slip.image_url,
      subtitle: `Event: ${change.value.event}\nMethod: ${change.value.payment.payment_method}\nMedia ID: ${change.value.media_id}`
    }

    sendGenericTemplate(change.value.page_id, change.value.payment.buyer_id, [item])
  }

  if (change.value.event === 'consent_dismissed') {
    debug('CONSENT DISMISSED', change)

    const message = "We noticed you have been dismiss payment confirmation.Do you want to retry confirmation flow ?"

    const buttons = [
      {
        "type": "postback",
        "payload": `YES_RETRY_CONFIRMATION:${change.value.media_id}`,
        "title": "Retry Confirmation"
      },
      {
        "type": "postback",
        "payload": "NO_RETRY_CONFIRMATION",
        "title": "No, Thanks"
      }
    ]

    await sendButtonTemplate(change.value.page_id, change.value.buyer_id, message, buttons)
  }

  if (change.value.event === 'bank_slip_verified') {
    debug('BANK SLIP VERIFIED', change)
    debug('BANK SLIP VERIFIED, PAYMENT DETAILS', change.value.payment)
    debug('BANK SLIP VERIFIED, PAYMENT METADATA', change.value.payment.metadata)
    debug('BANK SLIP VERIFIED, PAYMENT VALIDATION INFO', change.value.payment.metadata.bank_slip.validation_status)

    const message = "Your payment verified, This is your payment information:\n\n" +
      "💸 Buyer ID: " + change.value.buyer_id + "\n" +
      "📄 Page ID: " + change.value.page_id + "\n" +
      "📁 Event: " + change.value.event + "\n" +
      "🏦 Method: " + change.value.payment.payment_method + "\n" +
      "💰 amount: " + `${change.value.payment.payment_amount.amount} ${change.value.payment.payment_amount.currency}` + "\n" +
      "🆔 Tx ID: " + change.value.payment.metadata.bank_slip.bank_transfer_id + "\n" +
      "⏱️ Tx time: " + change.value.payment.metadata.bank_slip.transaction_time + "\n" +
      "✅ Validation: " + change.value.payment.metadata.bank_slip.validation_status + "\n" +
      matches(change.value.payment.metadata.bank_slip.validation_info.is_seller_onboarded) + " Seller Onboarded: " + change.value.payment.metadata.bank_slip.validation_info.is_seller_onboarded + "\n" +
      matches(change.value.payment.metadata.bank_slip.validation_info.matches_seller_account) + " Match Seller A/C: " + change.value.payment.metadata.bank_slip.validation_info.matches_seller_account + "\n" +
      check(change.value.payment.metadata.bank_slip.validation_info.is_duplicate) + " Duplicated: " + change.value.payment.metadata.bank_slip.validation_info.is_duplicate + "\n" +
      "😑 Sender: " + `${change.value.payment.metadata.bank_slip.sender_bank_code} - ${change.value.payment.metadata.bank_slip.sender_bank_account_id} - ${change.value.payment.metadata.bank_slip.sender_name}` + "\n" +
      "🤑 Receiver: " + `${change.value.payment.metadata.bank_slip.receiver_bank_code} - ${change.value.payment.metadata.bank_slip.receiver_bank_account_id} - ${change.value.payment.metadata.bank_slip.receiver_name}` + "\n"

    await sendTextMessage(change.value.page_id, change.value.payment.buyer_id, message)
    debug('Message', message);
  }
}

const matches = (val: any) => val.toString() === 'true' ? '✅' : '❌'
const check = (val: any) => val.toString() === 'true' ? '❌' : '✅'
