import React, {useState, useEffect} from 'react';
import Product from "./Product";

function Category({name, user, setUser}) {
    const [products, setProducts] = useState([]);

    const getCategoryProducts = () => {
        fetch(`http://localhost:3001/categories/${name}`, {credentials: 'include'})
            .then(res => res.json())
            .then(data => setProducts(data))
    };
    useEffect(getCategoryProducts, [name]);

    return (
        <section className="content">
            {products.map(product => <Product key={product.id}
                                              user={user}
                                              id={product.id}
                                              setUser={setUser}
                                              name={product.name}
                                              price={product.price}
                                              image={product.image}
                                              rating={product.rating}
                                              description={product.description}
                                              isLiked={product.users_likes.indexOf(user.id) !== -1}
            />)}
        </section>
    )
}

export default Category;