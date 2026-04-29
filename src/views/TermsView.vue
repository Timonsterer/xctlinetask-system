<template>
  <div class="terms-page">
    <h1>使用須知與條款</h1>

    <section class="warning">
      ⚠️ 請務必詳閱以下內容，若不同意請立即停止使用本平台
    </section>

    <section>
      <h2>使用須知</h2>
      <p>
        歡迎使用本平台。本平台僅提供任務媒合與資訊交流之功能，
        使用者於平台上之所有行為，應自行負責並遵守相關法律規定。
        使用本平台即表示您已閱讀、理解並同意本使用須知及相關條款。
      </p>
    </section>

    <section>
      <h2>條款與免責聲明</h2>

      <h3>1. 行為責任</h3>
      <ul>
        <li>使用者於本平台發布、接受或參與之所有任務與互動，均屬個人行為。</li>
        <li>所產生之風險、糾紛、損失或法律責任，概由使用者自行承擔。</li>
      </ul>

      <h3>2. 禁止事項</h3>
      <ul>
        <li>從事任何違法行為（如詐騙、毒品、非法交易等）</li>
        <li>危害他人安全或權益</li>
        <li>發布色情、暴力或不當內容</li>
        <li>冒用他人身份或提供不實資訊</li>
        <li>干擾平台正常運作之行為</li>
      </ul>

      <h3>3. 違規處理</h3>
      <ul>
        <li>平台有權刪除內容或停權帳號</li>
        <li>必要時配合司法或相關單位調查</li>
        <li>使用者不得請求任何賠償</li>
      </ul>

      <h3>4. 交易與互動風險</h3>
      <ul>
        <li>平台不介入任何金錢交易或實際見面</li>
        <li>請使用者自行評估風險並確保安全</li>
        <li>任何糾紛平台不負責</li>
      </ul>

      <h3>5. 免責聲明</h3>
      <ul>
        <li>平台不保證任何資訊之正確性或安全性</li>
        <li>因使用平台產生之損失，平台一概不負責</li>
      </ul>

      <h3>6. 條款修改</h3>
      <ul>
        <li>平台保留隨時修改條款之權利</li>
        <li>修改後將公告於平台，不另行通知</li>
      </ul>
    </section>

    <section class="final-warning">
      ⚠️ 本平台僅為媒合工具，不承擔任何中介或擔保責任
      ⚠️ 請務必自行評估風險並遵守法律
    </section>
  </div>
</template>

<script setup>
</script>

<style scoped>
.terms-page {
  padding: 20px;
  max-width: 800px;
  margin: auto;
  line-height: 1.6;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
}

h2 {
  margin-top: 20px;
  color: #333;
}

h3 {
  margin-top: 15px;
  color: #555;
}

.warning {
  background: #fff3cd;
  padding: 12px;
  border-left: 5px solid #ffc107;
  margin-bottom: 20px;
  font-weight: bold;
}

.final-warning {
  margin-top: 30px;
  padding: 12px;
  background: #f8d7da;
  border-left: 5px solid #dc3545;
  font-weight: bold;
}
</style>
