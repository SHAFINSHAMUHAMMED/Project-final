const productfilter=async(req,res)=>{
    try{
        const {categorys,brands,search,filterprice}=req.body  
        console.log(filterprice);
        let product
        if(!search){
            if(filterprice[0]){
                if(filterprice.length==2){
                product=await Product.find({
                    $and:[
                    {price:{$lte:Number(filterprice[1])}},
                    {price:{$gte:Number(filterprice[0])}}
                ]
                    
                }).populate('category')
            }else{
                product=await Product.find({
                    $and:[
                    {price:{$gte:Number(filterprice[0])}}
                ]
                    
                }).populate('category')
            }
            }else{
                product=await Product.find({}).populate('category')
            }
        
        }else{
            product=await Product.find({
                $or:[
                {brand:{$regex:'.*'+search+'.*',$options:'i'}},
               { title:{$regex:'.*'+search+'.*',$options:'i'}}
                ]
            }).populate('category')
        }
        let products=[]
        let Data=[]
        let Categorys
        let Datas=[]
        console.log(search);
      console.log(categorys);
      console.log(brands);
// CATEGORY FILTER/////////////
    
       Categorys=categorys.filter((value)=>{
        return value!==null
       })
   
      if(Categorys[0]){
       
        Categorys.forEach((element,i) => {
            products[i]=product.filter((value)=>{
                return value.category.category==element
            })
          });
        //   console.log(products);
          products.forEach((value,i)=>{
             Data[i]=value.filter((v)=>{
                return v
            })
          })
          if(brands[0]){
            let c=0
            // console.log(categorys);
            brands.forEach((value,i)=>{
                Data.forEach((element)=>{
                   Datas[i]=element.filter((product)=>{
                   
                        return product.brand==value
                     })
                })
            })
            
          }
          Datas.forEach((value,i)=>{
            Data[i]=value
          })
      }else{
        if(brands[0]){
            brands.forEach((element,i) => {
              Data[i]=product.filter((value)=>{
                return value.brand==element
                })
            });
            if(categorys[0]){
                categorys.forEach((value,i)=>{
                    Data.forEach(element => {
                        Datas[i]=element.filter((product)=>{
                            return product.category.category==value
                        })
                    });
                })
            }
        }else{
            Data[0]=product
        }
       
        
      }
    
    //////////
      res.json({Data})
      
    }catch(err){
        console.log(err);
    }
}