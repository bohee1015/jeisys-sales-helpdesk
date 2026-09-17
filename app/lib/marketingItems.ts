// 영업관리팀이 SAP에 입력할 때 참고하는 마케팅 물품 품목코드 표.
// 출처: 사내 "마케팅 출고 물품 목록" 엑셀 (수기 관리 파일이라 품목이 바뀌면 이 파일도 함께 갱신한다).

export type MarketingItem = {
  /** 장비명 (공용이면 장비 무관 물품) */
  equipment: string;
  /** 물품 이름 (리플렛, 바인더 등) */
  product: string;
  /** SAP 품목코드 */
  code: string;
  /** SAP 품목명 */
  itemName: string;
  /** 1회 출고 단위 수량 */
  unitQty: number | null;
  /** 1회 최대 출고 가능 수량 */
  max: number | null;
};

export const MARKETING_ITEMS: MarketingItem[] = [
  { equipment: "공용", product: "미니배너 거치대", code: "P04954A00", itemName: "[거치대] (S) 미니배너_150x300mm", unitQty: 1, max: 3 },
  { equipment: "공용", product: "리플렛거치대", code: "P01736A00", itemName: "[거치대] 리플렛 Catalog Holder A6 1Tier(Product No.F6001)", unitQty: 1, max: 3 },
  { equipment: "덴서티", product: "코팅 파라미터표", code: "P05841A00", itemName: "[COATING MANUAL] PARAMETER TABLE DS Hi", unitQty: 1, max: 3 },
  { equipment: "덴서티", product: "철제배너", code: "P07119A00", itemName: "[철제 배너] 500*1500 이영애 - DENSITY", unitQty: 1, max: 2 },
  { equipment: "덴서티", product: "아이쉴드", code: "P05853A00", itemName: "[CASE/EYE SHIELD MID] KR, Green 20x18x6h 1.2T_Dropper 1ea", unitQty: 1, max: 1 },
  { equipment: "덴서티", product: "사용자메뉴얼", code: "P05306A00", itemName: "[OPERATION MANUAL] DENSITY KR", unitQty: 1, max: 3 },
  { equipment: "덴서티", product: "바인더", code: "P05529A00", itemName: "[BINDER] (NIS) DENSITY_20x19x12.5cm(H)", unitQty: 1, max: 3 },
  { equipment: "덴서티", product: "미니배너", code: "P05524A00", itemName: "[배너] Mini - DENSITY HI", unitQty: 1, max: 3 },
  { equipment: "덴서티", product: "명패", code: "P05293A00", itemName: "[입점병원 명패] (NIS) DENSITY", unitQty: 1, max: 2 },
  { equipment: "덴서티", product: "리플렛", code: "P05525A00", itemName: "[리플렛] A4 3단접지 DS HI_랑데뷰내추럴 210g, 297x210", unitQty: 100, max: 300 },
  { equipment: "덴서티", product: "마킹페이퍼-페이스", code: "P05413A00", itemName: "[MARKING PAPER] DENSITY FACE (Pack[unit]=4Photo)", unitQty: 1, max: 30 },
  { equipment: "덴서티", product: "마킹페이퍼-아이", code: "P05412A00", itemName: "[MARKING PAPER] DENSITY EYE (Pack[unit]=4Photo)", unitQty: 1, max: 30 },
  { equipment: "덴서티", product: "마킹페이퍼-바디", code: "P05414A00", itemName: "[MARKING PAPER] DENSITY BODY (Pack[unit]=4Photo)", unitQty: 1, max: 30 },
  { equipment: "리니어지", product: "코팅 파라미터표", code: "P05856A00", itemName: "[COATING MANUAL] PARAMETER TABLE LZ", unitQty: 1, max: 3 },
  { equipment: "리니어지", product: "사용자메뉴얼", code: "P04956A00", itemName: "[OPERATION MANUAL] LinearZ KR", unitQty: 1, max: 3 },
  { equipment: "리니어지", product: "바인더", code: "P05842A00", itemName: "[BINDER] (NIS) LinearZ", unitQty: 1, max: 3 },
  { equipment: "리니어지", product: "미니배너", code: "P04951A01", itemName: "[배너] Mini - LinearZ", unitQty: 1, max: 3 },
  { equipment: "리니어지", product: "명패", code: "P05679A00", itemName: "[입점병원 명패] (NIS) LinearZ", unitQty: 1, max: 2 },
  { equipment: "리니어지", product: "리플렛", code: "P04959A01", itemName: "[리플렛] LinearZ_랑데뷰내추럴 160g, 295x230", unitQty: 100, max: 300 },
  { equipment: "리니어지", product: "철제배너", code: "P07121A00", itemName: "[철제 배너] 500*1500 이영애 - LINEARZ", unitQty: 1, max: 2 },
  { equipment: "트라이빔K", product: "매뉴얼", code: "P02062A01", itemName: "[OPERATION MANUAL] TRI-BEAM_KR", unitQty: 1, max: 3 },
  { equipment: "트라이빔K", product: "미니배너", code: "P02042A01", itemName: "[배너] Mini - TRI-BEAM K", unitQty: 1, max: 3 },
  { equipment: "트라이빔K", product: "리플렛", code: "P02051A00", itemName: "[리플렛] TRI-BEAM K_랑데뷰내추렬 190g, 198x230", unitQty: 100, max: 300 },
  { equipment: "트라이빔K", product: "대형배너", code: "P02032A01", itemName: "[배너] (L) - TRI-BEAM K", unitQty: 1, max: 2 },
  { equipment: "트라이빔프로", product: "매뉴얼", code: "P06248A00", itemName: "[OPERATION MANUAL] TRI-BEAM PRO_KR", unitQty: 1, max: null },
  { equipment: "포텐자", product: "코팅 파라미터표", code: "P05839A00", itemName: "[COATING MANUAL] PARAMETER TABLE PZ", unitQty: 1, max: null },
  { equipment: "포텐자", product: "철제배너", code: "P07120A00", itemName: "[철제 배너] 500*1500 이영애 - POTENZA", unitQty: 1, max: 2 },
  { equipment: "포텐자", product: "사용자메뉴얼", code: "P04570A00", itemName: "[OPERATION MANUAL] PZ KR Non-invassive", unitQty: 1, max: null },
  { equipment: "포텐자", product: "바인더", code: "P05698A00", itemName: "[BINDER] (NIS) POTENZA", unitQty: 1, max: null },
  { equipment: "포텐자", product: "미니배너", code: "P04567A01", itemName: "[배너] Mini - PZ Non Invasive", unitQty: 1, max: 3 },
  { equipment: "포텐자", product: "명패", code: "P05641A00", itemName: "[입점병원 명패] (NIS) POTENZA", unitQty: 1, max: 2 },
  { equipment: "포텐자", product: "리플렛", code: "P04569A01", itemName: "[리플렛] PZ Non Invasive_랑데뷰내추럴 210g, 297x210", unitQty: 100, max: 300 },
];
