

class ApiFeatures {
    constructor(query, queryStr) {
        this.query = query
        this.queryStr = queryStr
    }
    searchByPhone() {

        const keyword = this.queryStr.phone ? {
            phone: this.queryStr.phone
        } : {}

        this.query.find({ ...keyword })

        return this
    }
    searchByStd() {

        const keyword = this.queryStr.email ? {
            email: this.queryStr.email
        } : {}

        this.query.find({ ...keyword })

        return this
    }

    searchByName() {
        const keyword = this.queryStr.name ? {
            name: {
                $regex: this.queryStr.name,
                $options: 'i',
            },
        } : {}
        this.query.find({ ...keyword })
        return this
    }


    pagination(pagination) {
        const currentPage = Number(this.queryStr.page) || 1
        const skip = pagination * (currentPage - 1)

        this.query = this.query.limit(pagination).skip(skip)
        return this
    }


}
module.exports = ApiFeatures



