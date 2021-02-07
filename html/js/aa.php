<?php
/*
 * @Author: your name
 * @Date: 2020-12-02 23:30:48
 * @LastEditTime: 2020-12-14 02:29:02
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /scfgui-client/html/js/aa.php
 */


$dateTime = gmdate("D, d M Y H:i:s T");
$SecretId = 'AKIDlqr0q9sgs4cpxmewj7k6mtd0p76eRiBn1R6n'; // 密钥对的 SecretId
$SecretKey = 'b605GuIzgaM23GMl4ewlIQ4W7WXTVC1Ego1tDuKX'; // 密钥对的 SecretKey
$srcStr = "x-date: ".$dateTime."\n"."source: "."scfgui"; // 签名水印值，可填写任意值
$Authen = 'hmac id="'.$SecretId.'", algorithm="hmac-sha1", headers="x-date source", signature="';
$signStr = base64_encode(hash_hmac('sha1', $srcStr, $SecretKey, true));
$Authen = $Authen.$signStr."\"";
echo $dateTime;
echo $Authen;
#echo '</br>';

// $dateTime = 'Thu, 10 Dec 2020 06:32:42 GMT';
// $Authen = 'hmac id="AKIDlqr0q9sgs4cpxmewj7k6mtd0p76eRiBn1R6n", algorithm="hmac-sha1", headers="x-date source", signature="8017pPsnpUaKPqQ9V1AYsWJU8lo="';


$url = 'https://service-n1nmux9g-1251165361.gz.apigw.tencentcs.com/release/scfgui/account/addteam'; // 用户 API 的访问路径
$headers = array( 
    'Source: scfgui',
    'X-Date: '.$dateTime,
    'Authorization: '.$Authen,
    'X-Requested-With: XMLHttpRequest',
    'Accept-Encoding: gzip, deflate, sdch',
);
$ch = curl_init(); 
curl_setopt($ch, CURLOPT_URL,$url); 
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1); 
curl_setopt($ch, CURLOPT_TIMEOUT, 60); 
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers); 
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
$data = curl_exec($ch); 

if (curl_errno($ch)) { 
    print "Error: " . curl_error($ch); 
} else { 
    echo "\n";
    // var_dump($data);
    echo '\n';
    // Show me the result 
    var_dump(gzdecode($data));
    // var_dump(; 
    curl_close($ch); 
} 

?>