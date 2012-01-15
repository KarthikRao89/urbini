<div>
  <where value="forum.coupon.rewardForCheckIn == null">
    <text text="If you want to get a leg up on the competition for free tickets for the next event, do this one minute review and earn some points."/><br /><br /> 
    <text text="NOTE: you get points whether you went to the event or not, so don't be afraid to be honest."/><br/><br/>
    <br /><br />
    <property name="forum" type="y"/> "<property name="forum" href="y"/>"    
    <br/><br/>
    <property name="resourceMediumImage" noIcon="y" /><br /><br />
    <br/><br/>
    <h3><text text="So fess up, did you go to this event?"/></h3><br /> 
    <createReview options="amnesia,no" />
  </where>    
  <where value="forum.coupon.rewardForCheckIn != null">
    <!--text text="Earn #### #### by checking in for this deal!" params="forum.coupon.rewardForCheckIn.value,forum.coupon.rewardForCheckIn.currency" /-->
    <text text="Yes, it's time to earn some money for" /> "<property name="forum" href="y"/>"
    <br/><br/>
    <text text="Every month we award prizes to the people who used the free coupons, so don't forget to check in." />
    <br/><br/>
    <property name="resourceMediumImage" noIcon="y" />
    <br/><br/>
    <where value="forum.redeemed == true">
      <createReview />
    </where>
    <where value="forum.redeemed == null || forum.redeemed == false">
      <createReview options="later,wont" />
    </where>
  </where>
  
</div>