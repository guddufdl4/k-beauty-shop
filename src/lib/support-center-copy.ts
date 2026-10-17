const en={
 title:'How can we help your business?',intro:'Account verification, wholesale quotes and order support in one place.',search:'Search help articles',support:'Support',
 verification:'Complete your business verification',saved:'Registration number saved. Submit your business document to continue.',missing:'Add your registration number and business document in My account.',approved:'Your wholesale access is active.',review:'Your document is submitted. Contact us if wholesale access is still unavailable.',guest:'Sign in to check your business verification and inquiry history.',upload:'Upload document',account:'My account',steps:['Account created','Business document','Wholesale access'],
 topics:['Account & verification','Prices & MOQ','Quotes & orders','Shipping & payment'],topicHelp:['Account setup and business documents','Wholesale pricing and minimum quantities','Quote requests and order updates','Delivery, payment and import information'],
 my:'My inquiries',all:'All',awaiting:'Awaiting reply',answered:'Answered',closed:'Closed',empty:'No inquiries in this view.',login:'Sign in',view:'View conversation',team:'HMT Support',you:'You',attachment:'Download attachment',loadError:'We could not load your inquiries. Please refresh or contact us by email.',
 email:'Prefer email?',emailHelp:'Include your company name and inquiry reference.',faq:'Frequently asked questions',noResults:'No matching help articles. Send us an inquiry below.',next:'Next',previous:'Previous',history:'Your most recent 50 messages are shown.',
 questions:[
 ['Why can’t I see wholesale prices?','A saved registration number does not activate wholesale access by itself. Sign in to My account and submit a business registration certificate, local business licence or evidence of business operations. If the document is already submitted and prices are still hidden, contact support.'],
 ['Which business documents can I submit?','Submit a business registration certificate, local business licence or other evidence of business operations. PDF, JPG and PNG are supported. Mask unnecessary personal identifiers. Use the business verification form in My account.'],
 ['What is the minimum order amount?','The quotation subtotal must be more than USD 1,000, excluding shipping. Each product also has a minimum order quantity (MOQ).'],
 ['Do I have to order in full boxes?','MOQ is the minimum quantity, not a box increment. If MOQ is 40, you can request 40, 41 or more units. Stock figures do not impose a maximum; explicitly sold-out products cannot be requested. Final availability is confirmed with your quote.'],
 ['Where can I check replies?','Inquiries submitted while signed in appear in My inquiries on this page. Open the conversation to read replies or send a follow-up. Support replies are also emailed to your reply address. Guest inquiries receive replies by email.'],
 ['How are shipping and payment confirmed?','Shipping costs, delivery arrangements, availability and final prices are confirmed with your quotation. Payment is by bank transfer after confirmation. Include your destination country and order reference when contacting support.'],
 ]
};
const ko:typeof en={
 title:'사업에 필요한 도움을 찾아보세요',intro:'사업자 인증부터 도매 견적과 주문 문의까지, 한곳에서 확인하세요.',search:'궁금한 내용을 검색하세요',support:'고객센터',
 verification:'사업자 인증을 완료해 주세요',saved:'사업자번호는 등록됐습니다. 가격 열람을 위해 사업자 증빙을 제출해 주세요.',missing:'마이페이지에서 사업자번호와 증빙 자료를 등록해 주세요.',approved:'도매 가격을 열람할 수 있는 회원입니다.',review:'증빙 제출이 확인됐습니다. 가격이 보이지 않으면 고객센터로 문의해 주세요.',guest:'로그인하면 사업자 인증 상태와 내 문의 내역을 확인할 수 있습니다.',upload:'증빙 제출하기',account:'마이페이지',steps:['회원가입 완료','사업자 증빙 제출','도매 가격 열람'],
 topics:['가입·사업자 인증','가격·최소 주문량','견적·주문','배송·결제'],topicHelp:['회원 정보와 증빙 제출 안내','도매 가격과 최소 주문 조건','견적 요청과 주문 진행 확인','배송, 결제와 수입 관련 안내'],
 my:'내 문의함',all:'전체',awaiting:'답변 대기',answered:'답변 완료',closed:'처리 완료',empty:'해당하는 문의가 없습니다.',login:'로그인',view:'문의 내용·답변 보기',team:'HMT 고객센터',you:'고객',attachment:'첨부파일 받기',loadError:'문의 내역을 불러오지 못했습니다. 새로고침하거나 이메일로 문의해 주세요.',
 email:'이메일로 문의하시겠어요?',emailHelp:'회사명과 문의 접수 번호를 함께 알려 주세요.',faq:'자주 묻는 질문',noResults:'일치하는 도움말이 없습니다. 아래에서 문의를 남겨 주세요.',next:'다음',previous:'이전',history:'최근 메시지 50개를 표시합니다.',
 questions:[
 ['도매 가격이 보이지 않아요','사업자번호 등록만으로 가격 열람 권한이 활성화되지는 않습니다. 로그인 후 마이페이지에서 사업자등록증, 현지 사업 허가증 또는 사업 활동 증빙을 제출해 주세요. 이미 제출했는데도 가격이 보이지 않으면 고객센터로 문의해 주세요.'],
 ['어떤 사업자 증빙을 제출해야 하나요?','사업자등록증, 현지 사업 허가증 등 사업 활동을 확인할 수 있는 자료를 제출해 주세요. PDF·JPG·PNG 형식을 지원합니다. 불필요한 개인정보는 가리고 마이페이지의 사업자 인증 양식으로 제출해 주세요.'],
 ['최소 주문 금액은 얼마인가요?','견적 문의는 배송비를 제외한 상품 합계가 미화 1,000달러를 초과해야 가능합니다. 상품별 최소 주문 수량(MOQ)도 지켜 주세요.'],
 ['박스 수량의 배수로만 주문해야 하나요?','MOQ는 최소 수량입니다. MOQ가 40개라면 40개, 41개 이상으로 요청할 수 있습니다. 재고 수치에 따른 최대 수량 제한은 없으며, 명시적으로 품절된 상품은 요청할 수 없습니다. 최종 공급 가능 여부는 견적 시 확인합니다.'],
 ['답변은 어디서 확인하나요?','로그인 상태로 접수한 문의는 이 페이지의 내 문의함에 표시됩니다. 문의를 열어 답변을 확인하고 추가 문의를 보낼 수 있습니다. 고객센터 답변은 입력한 이메일로도 발송합니다. 비회원 문의는 이메일로 답변받습니다.'],
 ['배송과 결제는 어떻게 진행되나요?','배송비, 배송 방법, 공급 가능 여부와 최종 가격은 견적 시 확정합니다. 확인 후 계좌이체로 결제합니다. 문의할 때 배송 국가와 주문·견적 번호를 함께 알려 주세요.'],
 ]
};
export function supportCenterCopy(locale:string){return locale==='ko'?ko:en;}
