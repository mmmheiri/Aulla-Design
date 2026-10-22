export type PaymentMode="disabled"|"test"|"live";
export type TransferState="awaiting_transfer"|"receipt_received"|"under_review"|"confirmed"|"rejected";
export type PaymentSetup={mode:PaymentMode;accountVerified:boolean;serverReady:boolean;webhookVerified:boolean;bankVerified:boolean};
export function paymentReadiness(setup:PaymentSetup){
 return {ziina:setup.mode!=="disabled"&&setup.accountVerified&&setup.serverReady&&setup.webhookVerified,bank:setup.bankVerified&&setup.serverReady};
}
export function transferTransition(state:TransferState,next:TransferState,settlementVerified=false):TransferState{
 const allowed:Record<TransferState,TransferState[]>={awaiting_transfer:["receipt_received","under_review","rejected"],receipt_received:["under_review","rejected"],under_review:["confirmed","rejected"],confirmed:[],rejected:["under_review"]};
 if(!allowed[state].includes(next))throw new Error("Invalid transfer transition");
 if(next==="confirmed"&&!settlementVerified)throw new Error("Bank settlement verification is required");
 return next;
}
export const paymentSetup:PaymentSetup={mode:"disabled",accountVerified:false,serverReady:false,webhookVerified:false,bankVerified:false};
