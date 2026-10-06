export function validBusinessNumber(value:string):boolean {
 return value.length>=3 && value.length<=50 && /^[\p{L}\p{N} ./:-]+$/u.test(value) && /[\p{L}\p{N}]/u.test(value) && !/^(.)\1+$/.test(value.replace(/[ ./:-]/g,""));
}
